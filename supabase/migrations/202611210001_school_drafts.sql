begin;
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0)
);
create table public.school_members (
  school_id uuid not null references public.schools on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('teacher','admin')),
  primary key (school_id,user_id)
);
create index school_members_user_idx on public.school_members(user_id);
alter table public.school_members enable row level security;
alter table public.schools enable row level security;
revoke all on public.schools, public.school_members from anon, authenticated;
grant select on public.schools, public.school_members to authenticated;
create policy own_membership on public.school_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy member_school on public.schools for select to authenticated
  using (exists(select 1 from public.school_members m where m.school_id = schools.id));

create table public.drafts (
  school_id uuid not null references public.schools,
  owner_id uuid not null default auth.uid() references auth.users,
  id uuid not null,
  revision integer not null check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (school_id,owner_id,id)
);
alter table public.drafts enable row level security;
revoke all on public.drafts from anon, authenticated;
grant select, insert on public.drafts to authenticated;
grant update(revision,payload) on public.drafts to authenticated;
create policy teacher_drafts on public.drafts to authenticated
  using (owner_id = (select auth.uid()) and exists
    (select 1 from public.school_members m where m.school_id = drafts.school_id))
  with check (owner_id = (select auth.uid()) and exists
    (select 1 from public.school_members m where m.school_id = drafts.school_id));
commit;
