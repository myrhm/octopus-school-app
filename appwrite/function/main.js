import { grade, validAnswer, validQuestion } from './grading.js';
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
  async function update(id, record) {
    await api(docs + '/' + id, 'PATCH', { data: { payload: JSON.stringify(record) } });
  }
  function mediaIds(value, ids = new Set()) {
    if (Array.isArray(value)) {
      for (const node of value) mediaIds(node, ids);
    } else if (value && typeof value === 'object') {
      if (value.type === 'schoolImage') ids.add(value.attrs?.fileId);
      for (const key of ['content', 'options']) mediaIds(value[key], ids);
    }
    return ids;
  }
  async function verifiedMedia(id, school) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9._-]{1,36}$/.test(id)) deny(400);
    const meta = await api('/storage/buckets/question-media/files/' + id);
    if (!meta.$permissions.includes('read("team:' + school + '/teacher")')) deny(403);
    return meta;
  }
  async function imageData(id, meta) {
    const image = await fetch(endpoint + '/storage/buckets/question-media/files/' + id + '/view', {
      headers: { 'X-Appwrite-Key': key, 'X-Appwrite-Project': project },
    });
    if (!image.ok) deny(image.status);
    return (
      'data:' +
      meta.mimeType +
      ';base64,' +
      Buffer.from(await image.arrayBuffer()).toString('base64')
    );
  }
  async function finalize(attemptId, attempt, bank, answers) {
    const outcome = grade(bank.questions, answers);
    try {
      await create(
        hash('results', attempt.exam),
        {
          attempt: attemptId,
          answers,
          ...outcome,
          submitted_at: new Date().toISOString(),
        },
        hash('submission', attemptId),
      );
    } catch (e) {
      if (e.status !== 409) throw e;
    }
  }
  async function examBank(exam) {
    const bank = await get(exam.bank_id, hash('bank', exam.school));
    return {
      ...bank,
      questions: exam.questionIds
        ? bank.questions.filter((q) => exam.questionIds.includes(q.id))
        : bank.questions,
    };
  }
  async function scored(result, bank) {
    if (!result) return null;
    const computed = result.marks ?? grade(bank.questions, result.answers ?? {}).marks;
    const edits = (await list(hash('adjustment', result.attempt))).sort(
      (a, b) => a.revision - b.revision,
    );
    const marks = { ...computed };
    for (const edit of edits) marks[edit.question] = edit.points;
    const max = bank.questions.reduce((n, q) => n + (q.weight ?? 1), 0);
    const percent = Object.values(marks).some((v) => v == null)
      ? null
      : Math.round((100 * Object.values(marks).reduce((n, v) => n + v, 0)) / max);
    return {
      marks,
      percent,
      revision: edits.length,
      audit: edits.map(({ question, points, reason, at }) => ({ question, points, reason, at })),
    };
  }
  async function handle() {
    if (req.headers['x-appwrite-trigger'] === 'schedule') {
      for (const exam of await list('exam')) {
        for (const attempt of await list(hash('attempt', exam.rowId))) {
          if (Date.now() < (attempt.deadline ?? Date.parse(exam.closes_at))) continue;
          try {
            await get(hash('submission', attempt.rowId));
            continue;
          } catch (e) {
            if (e.status !== 404) throw e;
          }
          const latest = (await list(hash('progress', attempt.rowId))).sort(
            (a, b) => b.revision - a.revision,
          )[0];
          await finalize(attempt.rowId, attempt, await examBank(exam), latest?.answers ?? {});
        }
      }
      return true;
    }
    if (input.action === 'start_exam') {
      const exam = await get(input.exam, 'exam');
      if (Date.now() < Date.parse(exam.opens_at) || Date.now() >= Date.parse(exam.closes_at))
        deny(403);
      if (['paused', 'closed', 'archived'].includes(exam.state)) deny(403);
      const participant = String(input.participant_name ?? '').trim();
      if (!participant || participant.length > 100) deny(400);
      const bank = await examBank(exam);
      if (exam.restricted) {
        await get(hash('credential', input.exam, input.code), hash('credentials', input.exam));
      }
      const token = exam.restricted ? hash('token', input.exam, input.code) : randomUUID();
      const attempt = hash('participant', token);
      let deadline = Math.min(
        Date.parse(exam.closes_at),
        Date.now() + (exam.minutes ?? 1440) * 60000,
      );
      let previous;
      try {
        await create(
          hash('attempt', input.exam),
          { exam: input.exam, participant, deadline },
          attempt,
        );
      } catch (e) {
        if (e.status !== 409 || !exam.restricted) throw e;
        const existing = await get(attempt, hash('attempt', input.exam));
        if (existing.revoked || existing.locked || Date.now() >= existing.deadline) deny(403);
        deadline = existing.deadline;
        previous = (await list(hash('progress', attempt))).sort(
          (a, b) => b.revision - a.revision,
        )[0];
      }
      let submitted = false;
      if (exam.restricted) {
        try {
          await get(hash('submission', attempt));
          submitted = true;
        } catch (e) {
          if (e.status !== 404) throw e;
        }
      }
      return {
        attempt: token,
        answers: previous?.answers,
        revision: previous?.revision,
        submitted,
        deadline,
        title: bank.title,
        instructions: exam.instructions,
        questions: bank.questions.map(({ id, content, options, kind }) => ({
          kind: kind ?? 'single',
          id,
          content,
          options: options.map(({ id, content }) => ({ id, content })),
        })),
      };
    }
    if (
      [
        'submit_exam',
        'save_answers',
        'participant_media',
        'released_result',
        'attempt_status',
        'resume_exam',
      ].includes(input.action)
    ) {
      let attemptId = hash('participant', input.attempt);
      let attempt;
      try {
        attempt = await get(attemptId);
      } catch (e) {
        if (e.status !== 404) throw e;
        attempt = await get(input.attempt);
        if (!attempt.exam || attempt.deadline) deny(403);
        attemptId = input.attempt;
      }
      await get(attemptId, hash('attempt', attempt.exam));
      const exam = await get(attempt.exam, 'exam');
      if (attempt.revoked) deny(403);
      if (input.action === 'resume_exam') {
        if (attempt.exam !== input.exam) deny(403);
        const bank = await examBank(exam),
          progress = (await list(hash('progress', attemptId))).sort(
            (a, b) => b.revision - a.revision,
          )[0];
        let submitted = false;
        try {
          await get(hash('submission', attemptId));
          submitted = true;
        } catch (e) {
          if (e.status !== 404) throw e;
        }
        return {
          submitted,
          answers: progress?.answers ?? {},
          revision: progress?.revision ?? 0,
          deadline: attempt.deadline ?? Date.parse(exam.closes_at),
          title: bank.title,
          instructions: exam.instructions,
          questions: bank.questions.map(({ id, kind, content, options }) => ({
            id,
            kind,
            content,
            options: options.map(({ id, content }) => ({ id, content })),
          })),
        };
      }
      if (input.action === 'attempt_status')
        return {
          locked: !!attempt.locked,
          state: exam.state ?? 'open',
          warning: attempt.warning ?? '',
        };
      if (input.action === 'released_result') {
        if (!exam.released) return null;
        const result = await get(hash('submission', attemptId), hash('results', attempt.exam));
        const score = await scored(result, await examBank(exam));
        return { correct: result.correct_count, percent: score.percent };
      }
      if (
        attempt.locked ||
        ['paused', 'closed', 'archived'].includes(exam.state) ||
        Date.now() >= (attempt.deadline ?? Date.parse(exam.closes_at))
      )
        deny(403);
      const bank = await examBank(exam);
      if (input.action === 'participant_media') {
        if (!mediaIds(bank.questions).has(input.fileId)) deny(403);
        const meta = await verifiedMedia(input.fileId, exam.school);
        return imageData(input.fileId, meta);
      }
      const answers = input.responses;
      if (
        !answers ||
        Array.isArray(answers) ||
        typeof answers !== 'object' ||
        Object.entries(answers).some(
          ([id, opt]) =>
            !validAnswer(
              bank.questions.find((q) => q.id === id),
              opt,
            ),
        )
      )
        deny(400);
      if (input.action === 'save_answers') {
        try {
          await get(hash('submission', attemptId));
          deny(409);
        } catch (e) {
          if (e.status !== 404) throw e;
        }
        const revision = input.revision;
        if (!Number.isSafeInteger(revision) || revision < 1) deny(400);
        const id = hash('progress', attemptId, revision);
        try {
          await create(hash('progress', attemptId), { answers, revision }, id);
        } catch (e) {
          if (e.status !== 409) throw e;
          const prior = await get(id, hash('progress', attemptId));
          if (JSON.stringify(prior.answers) !== JSON.stringify(answers)) deny(409);
        }
        return true;
      }
      await finalize(attemptId, attempt, bank, answers);
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
    const canRead = (b) =>
      !b.owner || b.owner === user || b.shared === true || b.readers?.includes(user);
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
      case 'bank_detail': {
        const b = await get(input.id, bank);
        if (!canRead(b)) deny(403);
        return b;
      }
      case 'share_bank': {
        const b = await get(input.id, bank);
        if (b.owner !== user) deny(403);
        await update(input.id, {
          ...b,
          shared: input.shared === true,
          readers: Array.isArray(input.readers)
            ? input.readers.filter((id) => typeof id === 'string')
            : [],
        });
        return true;
      }
      case 'bank':
        return (await list(bank)).filter(canRead).map((b) => ({
          id: b.rowId,
          title: b.title,
          revision: b.revision,
          owned: b.owner === user,
          readers: b.owner === user ? b.readers : undefined,
          shared: b.shared,
        }));
      case 'publish': {
        if (
          !Array.isArray(input.questions) ||
          !input.questions.length ||
          input.questions.some((q) => !validQuestion(q))
        )
          deny(400);
        for (const id of mediaIds(input.questions)) await verifiedMedia(id, school);
        return create(bank, {
          revision: input.revision ?? null,
          sourceId: input.sourceId ?? null,
          owner: user,
          shared: false,
          title: input.title,
          questions: input.questions,
        });
      }
      case 'schedule': {
        if (
          input.minutes != null &&
          (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1440)
        )
          deny(400);
        const source = await get(input.bank_id, bank);
        if (!canRead(source)) deny(403);
        if (
          input.questionIds &&
          (!Array.isArray(input.questionIds) ||
            !input.questionIds.length ||
            input.questionIds.some((id) => !source.questions.some((q) => q.id === id)))
        )
          deny(400);
        if (!(Date.parse(input.opens_at) < Date.parse(input.closes_at))) deny(400);
        const id = randomUUID();
        await create(
          'exam',
          {
            school,
            user,
            bank_id: input.bank_id,
            questionIds: input.questionIds,
            restricted: Boolean(input.restricted),
            subject: String(input.subject ?? '').slice(0, 120),
            className: String(input.className ?? '').slice(0, 120),
            passMark: Math.min(100, Math.max(0, Number(input.passMark ?? 70))),
            minutes: input.minutes ?? 1440,
            instructions: String(input.instructions ?? '').slice(0, 4000),
            opens_at: input.opens_at,
            closes_at: input.closes_at,
          },
          id,
        );
        return id;
      }
      case 'adjust_grade': {
        const exam = await get(input.exam, 'exam');
        if (exam.user !== user || exam.school !== school) deny(403);
        const result = await get(hash('submission', input.id), hash('results', input.exam));
        const set = await examBank(exam),
          q = set.questions.find((q) => q.id === input.question);
        if (
          !q ||
          !Number.isFinite(input.points) ||
          input.points < 0 ||
          input.points > (q.weight ?? 1) ||
          !String(input.reason ?? '').trim()
        )
          deny(400);
        const score = await scored(result, set);
        if (score.revision !== input.expected) deny(409);
        await create(
          hash('adjustment', input.id),
          {
            question: q.id,
            points: input.points,
            reason: String(input.reason).slice(0, 500),
            actor: user,
            at: new Date().toISOString(),
            revision: score.revision + 1,
          },
          hash('adjustment', input.id, score.revision + 1),
        );
        return true;
      }
      case 'credential': {
        const exam = await get(input.id, 'exam');
        if (exam.user !== user || exam.school !== school || !exam.restricted) deny(403);
        const code = randomUUID();
        await create(
          hash('credentials', input.id),
          { created_at: new Date().toISOString() },
          hash('credential', input.id, code),
        );
        return code;
      }
      case 'manage_exam': {
        const exam = await get(input.id, 'exam');
        if (exam.user !== user || exam.school !== school) deny(403);
        if (input.state && ['open', 'paused', 'closed', 'archived'].includes(input.state))
          exam.state = input.state;
        else if (typeof input.released === 'boolean') exam.released = input.released;
        else deny(400);
        await update(input.id, exam);
        return true;
      }
      case 'warn_attempt':
      case 'revoke_attempt':
      case 'lock_attempt': {
        const exam = await get(input.exam, 'exam');
        if (exam.user !== user || exam.school !== school) deny(403);
        const attempt = await get(input.id, hash('attempt', input.exam));
        const change =
          input.action === 'warn_attempt'
            ? {
                warning: String(input.warning ?? '')
                  .trim()
                  .slice(0, 500),
              }
            : input.action === 'revoke_attempt'
              ? { revoked: true }
              : { locked: Boolean(input.locked) };
        await update(input.id, { ...attempt, ...change });
        await create(hash('events', input.exam), {
          participant: attempt.participant,
          type: input.action,
          at: new Date().toISOString(),
          actor: user,
        });
        return true;
      }
      case 'exams': {
        const exams = (await list('exam')).filter((e) => e.school === school && e.user === user);
        return Promise.all(
          exams.map(async (e) => {
            const results = new Map(
              (await list(hash('results', e.rowId))).map((r) => [r.attempt, r]),
            );
            const set = await examBank(e);
            return {
              questions: set.questions.map(({ id, content, weight }) => ({
                id,
                content,
                weight: weight ?? 1,
              })),
              id: e.rowId,
              title: set.title,
              subject: e.subject,
              className: e.className,
              passMark: e.passMark ?? 70,
              events: await list(hash('events', e.rowId)),
              state: e.state ?? 'open',
              restricted: Boolean(e.restricted),
              released: Boolean(e.released),
              opens_at: e.opens_at,
              closes_at: e.closes_at,
              attempts: await Promise.all(
                (await list(hash('attempt', e.rowId))).map(async (a) => ({
                  score: await scored(results.get(a.rowId), set),
                  progress: Object.keys(
                    (await list(hash('progress', a.rowId))).sort(
                      (a, b) => b.revision - a.revision,
                    )[0]?.answers ?? {},
                  ).length,
                  answers: results.get(a.rowId)?.answers,
                  id: a.rowId,
                  locked: Boolean(a.locked),
                  participant: a.participant,
                  submitted_at: results.get(a.rowId)?.submitted_at,
                  correct_count: results.get(a.rowId)?.correct_count,
                })),
              ),
            };
          }),
        );
      }
      case 'teacher_media':
        return imageData(input.fileId, await verifiedMedia(input.fileId, school));
      case 'upload': {
        if (!['image/png', 'image/webp', 'image/jpeg'].includes(input.mime)) deny(400);
        const bytes = Buffer.from(input.content, 'base64');
        if (bytes.length > 1048576) deny(413);
        const form = new FormData();
        form.set('fileId', randomUUID());
        form.set('file', new Blob([bytes], { type: input.mime }), input.name);
        for (const role of ['teacher', 'admin'])
          form.append('permissions[]', 'read("team:' + school + '/' + role + '")');
        const png = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
          jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
          webp =
            bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!{ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp }[input.mime]) deny(400);
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
