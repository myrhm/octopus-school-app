import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../appwrite/function/main.js';

test('school publication, credential resume, grading, audited corrections and deadline recovery', async (t) => {
  const rows = new Map();
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://example.test/v1';
  t.mock.method(globalThis, 'fetch', async (raw, options) => {
    const url = new URL(raw),
      id = url.pathname.split('/').pop();
    let data,
      status = 200;
    if (url.pathname.endsWith('/memberships'))
      data = { memberships: [{ confirm: true, userId: 'teacher', roles: ['teacher'] }] };
    else if (options.method === 'POST') {
      const { rowId, data: record } = JSON.parse(options.body);
      if (rows.has(rowId)) status = 409;
      else rows.set(rowId, { $id: rowId, ...record });
      data = {};
    } else if (options.method === 'PATCH') {
      Object.assign(rows.get(id), JSON.parse(options.body).data);
      data = {};
    } else if (id === 'rows') {
      const q = JSON.parse(url.searchParams.get('queries[]'));
      data = { rows: [...rows.values()].filter((r) => r.scopeKey === q.values[0]) };
    } else {
      data = rows.get(id);
      if (!data) status = 404;
    }
    return Response.json(data ?? {}, { status });
  });
  async function action(action, input = {}, expected = 200, trigger = 'http') {
    const result = await handler({
      req: {
        headers: { 'x-appwrite-user-id': 'teacher', 'x-appwrite-trigger': trigger },
        bodyJson: { action, school: 'school', ...input },
      },
      res: { json: (value, status = 200) => ({ value, status }) },
      error: () => {},
    });
    assert.equal(result.status, expected, action);
    return result.value;
  }
  const q = (id, kind, extra) => ({
    id,
    kind,
    content: [{ type: 'paragraph' }],
    options: [],
    ...extra,
  });
  const bank_id = await action('publish', {
    title: 'Pilot',
    questions: [q('a', 'short', { accepted: ['Air'] }), q('b', 'essay', { weight: 2 })],
  });
  const exam = await action('schedule', {
    bank_id,
    restricted: true,
    minutes: 1,
    opens_at: new Date(Date.now() - 10000),
    closes_at: new Date(Date.now() + 600000),
  });
  const code = await action('credential', { id: exam });
  const session = await action('start_exam', { exam, code, participant_name: 'Peserta' });
  assert.equal(session.questions[0].accepted, undefined);
  const { attempt } = session,
    responses = { a: 'AIR', b: 'Contoh' };
  await action('save_answers', { attempt, responses, revision: 1 });
  assert.deepEqual(
    (await action('start_exam', { exam, code, participant_name: 'Peserta' })).answers,
    responses,
  );
  await action('submit_exam', { attempt, responses });
  await action('save_answers', { attempt, responses, revision: 2 }, 409);
  assert.equal(await action('released_result', { attempt }), null);
  const reports = await action('exams');
  const id = reports[0].attempts[0].id;
  await action('adjust_grade', {
    id,
    exam,
    question: 'b',
    points: 2,
    expected: 0,
    reason: 'Sesuai rubrik',
  });
  await action(
    'adjust_grade',
    { id, exam, question: 'b', points: 0, expected: 0, reason: 'Konflik' },
    409,
  );
  await action('manage_exam', { id: exam, released: true });
  assert.equal((await action('released_result', { attempt })).percent, 100);
  const second = await action('start_exam', {
    exam,
    code: await action('credential', { id: exam }),
    participant_name: 'Kedua',
  });
  await action('save_answers', { attempt: second.attempt, revision: 1, responses: { a: 'air' } });
  assert.equal(
    (await action('exams'))[0].attempts.find((a) => a.participant === 'Kedua').submitted_at,
    undefined,
  );
  t.mock.method(Date, 'now', () => second.deadline + 1);
  const originalExam = rows.get(exam).payload;
  rows.get(exam).payload = JSON.stringify({ ...JSON.parse(originalExam), user: 'another-teacher' });
  assert.deepEqual(await action('exams'), []);
  assert.equal(
    (await action('released_result', { attempt: second.attempt }, 404)).error,
    'Permintaan gagal.',
  );
  rows.get(exam).payload = originalExam;
  const finalized = (await action('exams'))[0].attempts.find((a) => a.participant === 'Kedua');
  assert.ok(finalized.submitted_at);
  assert.equal(finalized.correct_count, 1);
  assert.equal(finalized.answers.a, 'air');
  const finalizedAt = finalized.submitted_at;
  assert.equal(
    (await action('exams'))[0].attempts.find((a) => a.participant === 'Kedua').submitted_at,
    finalizedAt,
  );
  await action('', {}, 200, 'schedule');
  assert.equal((await action('released_result', { attempt: second.attempt })).percent, 33);
});
