begin;
create table public.bank_sets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools,
  title text not null,
  questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)>0),
  created_by uuid not null default auth.uid() references auth.users
);
alter table public.bank_sets enable row level security;
revoke all on public.bank_sets from anon,authenticated;
grant select,insert on public.bank_sets to authenticated;
create policy read_bank on public.bank_sets for select to authenticated using
  (exists(select 1 from public.school_members m where m.school_id=bank_sets.school_id));
create policy publish_bank on public.bank_sets for insert to authenticated with check
  (created_by=auth.uid() and exists(select 1 from public.school_members m where m.school_id=bank_sets.school_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('question-media','question-media',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy school_media_read on storage.objects for select to authenticated using
  (bucket_id='question-media' and exists(select 1 from public.school_members m where m.school_id::text=split_part(name,'/',1)));
create policy school_media_upload on storage.objects for insert to authenticated with check
  (bucket_id='question-media' and exists(select 1 from public.school_members m where m.school_id::text=split_part(name,'/',1)));

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.bank_sets,
  created_by uuid not null default auth.uid() references auth.users,
  opens_at timestamptz not null,
  closes_at timestamptz not null check(closes_at>opens_at)
);
alter table public.exams enable row level security;
revoke all on public.exams from anon,authenticated;
grant select,insert on public.exams to authenticated;
create policy teacher_exam on public.exams to authenticated using
  (created_by=auth.uid() and exists(select 1 from public.bank_sets b where b.id=exams.bank_id))
  with check(created_by=auth.uid() and exists(select 1 from public.bank_sets b where b.id=exams.bank_id));

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams,
  participant text not null check(length(trim(participant)) between 1 and 100),
  answers jsonb,
  submitted_at timestamptz,
  correct_count integer
);
alter table public.attempts enable row level security;
revoke all on public.attempts from anon,authenticated;
grant select on public.attempts to authenticated;
create policy teacher_results on public.attempts for select to authenticated using
  (exists(select 1 from public.exams e where e.id=attempts.exam_id));

create function public.start_exam(exam uuid, participant_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare items jsonb; attempt uuid; title text;
begin
  select b.questions,b.title into strict items,title from public.exams e join public.bank_sets b on b.id=e.bank_id
    where e.id=exam and now()>=e.opens_at and now()<e.closes_at;
  insert into public.attempts(exam_id,participant) values(exam,trim(participant_name)) returning id into attempt;
  return jsonb_build_object('attempt',attempt,'title',title,'questions',
    (select jsonb_agg(jsonb_build_object('id',q->'id','content',q->'content','options',q->'options') order by ord)
     from jsonb_array_elements(items) with ordinality x(q,ord)));
end;
$$;

create function public.submit_exam(attempt uuid, responses jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare items jsonb; submitted timestamptz; deadline timestamptz;
begin
  select b.questions,a.submitted_at,e.closes_at into strict items,submitted,deadline
    from public.attempts a join public.exams e on e.id=a.exam_id join public.bank_sets b on b.id=e.bank_id
    where a.id=attempt for update of a;
  if submitted is not null then return; end if;
  if clock_timestamp()>=deadline or jsonb_typeof(responses) is distinct from 'object' then raise exception 'Submission unavailable'; end if;
  if exists(select 1 from jsonb_each_text(responses) r where not exists
    (select 1 from jsonb_array_elements(items) q, jsonb_array_elements(q->'options') o where q->>'id'=r.key and o->>'id'=r.value))
    then raise exception 'Invalid answer'; end if;
  update public.attempts set answers=responses,submitted_at=clock_timestamp(),correct_count=
    (select count(*) from jsonb_array_elements(items) q where responses->>(q->>'id')=q->>'correctOptionId') where id=attempt;
end;
$$;
revoke all on function public.start_exam(uuid,text), public.submit_exam(uuid,jsonb) from public;
grant execute on function public.start_exam(uuid,text), public.submit_exam(uuid,jsonb) to anon,authenticated;
commit;
