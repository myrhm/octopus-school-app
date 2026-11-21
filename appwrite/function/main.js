import { createHash, randomUUID } from 'node:crypto';
const hash = (...values) =>
  createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 36);
const query = (method, attribute, values) => JSON.stringify({ method, attribute, values });
const deny = (status) => {
  throw Object.assign(new Error(), { status });
};
export default async function ({ req, res, error }) {
  const input = req.bodyJson ?? {};
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = req.headers['x-appwrite-key'];
  const user = req.headers['x-appwrite-user-id'];
  const school = input.school;
  async function api(path, method = 'GET', body) {
    const form = body instanceof FormData;
    const result = await fetch(endpoint + path, {
      method,
      headers: {
        'X-Appwrite-Project': project,
        'X-Appwrite-Key': key,
        ...(form ? {} : { 'Content-Type': 'application/json' }),
      },
      body: form ? body : JSON.stringify(body),
    });
    if (!result.ok) deny(result.status);
    return result.json();
  }
  const docs = '/tablesdb/octopus/tables/records/rows';
  async function create(group, value, id = randomUUID()) {
    await api(docs, 'POST', {
      rowId: id,
      data: { scopeKey: group, payload: JSON.stringify(value) },
      permissions: [],
    });
    return id;
  }
  async function list(group) {
    const records = [];
    let cursor;
    for (;;) {
      const qs = new URLSearchParams();
      for (const q of [
        query('equal', 'scopeKey', [group]),
        JSON.stringify({ method: 'limit', values: [100] }),
        ...(cursor ? [JSON.stringify({ method: 'cursorAfter', values: [cursor] })] : []),
      ])
        qs.append('queries[]', q);
      const page = await api(docs + '?' + qs);
      records.push(...page.rows.map((d) => ({ ...JSON.parse(d.payload), rowId: d.$id })));
      if (page.rows.length < 100) return records;
      cursor = page.rows.at(-1).$id;
    }
  }
  async function get(id, group) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id)) deny(400);
    const doc = await api(docs + '/' + id);
    if (group && doc.scopeKey !== group) deny(404);
    return JSON.parse(doc.payload);
  }
  async function handle() {
    if (input.action === 'start_exam') {
      const exam = await get(input.exam, 'exam');
      if (Date.now() < Date.parse(exam.opens_at) || Date.now() >= Date.parse(exam.closes_at))
        deny(403);
      const participant = String(input.participant_name ?? '').trim();
      if (!participant || participant.length > 100) deny(400);
      const bank = await get(exam.bank_id, hash('bank', exam.school));
      const attempt = await create(hash('attempt', input.exam), { exam: input.exam, participant });
      return {
        attempt,
        title: bank.title,
        questions: bank.questions.map(({ id, content, options }) => ({
          id,
          content,
          options: options.map(({ id, content }) => ({ id, content })),
        })),
      };
    }
    if (input.action === 'submit_exam') {
      const attempt = await get(input.attempt);
      if (!attempt.exam) deny(404);
      const exam = await get(attempt.exam, 'exam');
      if (Date.now() >= Date.parse(exam.closes_at)) deny(403);
      const bank = await get(exam.bank_id, hash('bank', exam.school));
      const answers = input.responses;
      if (
        !answers ||
        Array.isArray(answers) ||
        typeof answers !== 'object' ||
        Object.entries(answers).some(
          ([id, opt]) =>
            !bank.questions.find((q) => q.id === id)?.options.some((o) => o.id === opt),
        )
      )
        deny(400);
      const score = bank.questions.filter((q) => answers[q.id] === q.correctOptionId).length;
      try {
        await create(
          hash('results', attempt.exam),
          {
            attempt: input.attempt,
            answers,
            correct_count: score,
            submitted_at: new Date().toISOString(),
          },
          hash('submission', input.attempt),
        );
      } catch (e) {
        if (e.status !== 409) throw e;
      }
      return true;
    }
    if (!user || typeof school !== 'string' || !school) deny(403);
    const params = new URLSearchParams({ 'queries[]': query('equal', 'userId', [user]) });
    const members = await api('/teams/' + encodeURIComponent(school) + '/memberships?' + params);
    if (
      !members.memberships.some(
        (m) =>
          m.userId === user && m.confirm && m.roles.some((r) => ['teacher', 'admin'].includes(r)),
      )
    )
      deny(403);
    const drafts = hash('drafts', school, user),
      bank = hash('bank', school);
    switch (input.action) {
      case 'save': {
        const { record, expected } = input;
        if (
          typeof record?.id !== 'string' ||
          !Number.isSafeInteger(expected) ||
          expected < 0 ||
          record.revision !== expected + 1
        )
          deny(400);
        if (expected) await get(hash(drafts, record.id, expected), drafts);
        await create(drafts, record, hash(drafts, record.id, expected + 1));
        return true;
      }
      case 'drafts':
      case 'draft': {
        const latest = new Map();
        for (const record of await list(drafts))
          if ((latest.get(record.id)?.revision ?? 0) < record.revision)
            latest.set(record.id, record);
        return input.action === 'draft' ? (latest.get(input.id) ?? null) : [...latest.values()];
      }
      case 'bank':
        return (await list(bank)).map((b) => ({ id: b.rowId, title: b.title }));
      case 'publish': {
        if (
          !Array.isArray(input.questions) ||
          !input.questions.length ||
          input.questions.some((q) => !q.options?.some((o) => o.id === q.correctOptionId))
        )
          deny(400);
        return create(bank, { title: input.title, questions: input.questions });
      }
      case 'schedule': {
        await get(input.bank_id, bank);
        if (!(Date.parse(input.opens_at) < Date.parse(input.closes_at))) deny(400);
        const id = randomUUID();
        await create(
          'exam',
          {
            school,
            user,
            bank_id: input.bank_id,
            opens_at: input.opens_at,
            closes_at: input.closes_at,
          },
          id,
        );
        return id;
      }
      case 'exams': {
        const exams = (await list('exam')).filter((e) => e.school === school && e.user === user);
        return Promise.all(
          exams.map(async (e) => {
            const results = new Map(
              (await list(hash('results', e.rowId))).map((r) => [r.attempt, r]),
            );
            return {
              id: e.rowId,
              opens_at: e.opens_at,
              closes_at: e.closes_at,
              attempts: (await list(hash('attempt', e.rowId))).map((a) => ({
                participant: a.participant,
                submitted_at: results.get(a.rowId)?.submitted_at,
                correct_count: results.get(a.rowId)?.correct_count,
              })),
            };
          }),
        );
      }
      case 'upload': {
        if (!['image/png', 'image/webp', 'image/jpeg'].includes(input.mime)) deny(400);
        const bytes = Buffer.from(input.content, 'base64');
        if (bytes.length > 1048576) deny(413);
        const form = new FormData();
        form.set('fileId', randomUUID());
        form.set('file', new Blob([bytes], { type: input.mime }), input.name);
        for (const role of ['teacher', 'admin'])
          form.append('permissions[]', 'read("team:' + school + '/' + role + '")');
        const file = await api('/storage/buckets/question-media/files', 'POST', form);
        return file.$id;
      }
      default:
        deny(400);
    }
  }
  try {
    return res.json(await handle());
  } catch (e) {
    error('Request failed: ' + (e.status ?? 500));
    return res.json({ error: 'Permintaan gagal.' }, e.status ?? 500);
  }
}
