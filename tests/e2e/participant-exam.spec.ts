import { expect, test } from '@playwright/test';

test('participant joins without teacher login, sees images, resumes and submits', async ({
  page,
}) => {
  let saved: Record<string, string> = {};
  let submitted = false;
  const media: string[] = [];
  const image = (fileId: string, alt: string) => ({
    type: 'paragraph',
    content: [{ type: 'schoolImage', attrs: { fileId, alt, width: 320 } }],
  });
  const session = () => ({
    title: 'Ujian siswa bergambar',
    deadline: Date.now() + 600000,
    submitted,
    answers: saved,
    revision: 1,
    questions: [
      {
        id: 'q1',
        kind: 'single',
        content: [image('question-picture', 'Gambar pertanyaan')],
        options: [
          { id: 'a', content: [image('answer-picture', 'Gambar jawaban A')] },
          {
            id: 'b',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Jawaban B' }] }],
          },
        ],
      },
    ],
  });
  await page.route('**/account', (route) =>
    route.fulfill({ status: 401, json: { message: 'Guest' } }),
  );
  let started = false;
  await page.route('**/api/participant', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'resume_exam' && !started) return route.fulfill({ status: 401, json: {} });
    if (body.action === 'start_exam') {
      expect(body.participant_name).toBe('Siswa Uji');
      started = true;
      return route.fulfill({ json: session() });
    }
    if (body.action === 'resume_exam') return route.fulfill({ json: session() });
    if (body.action === 'participant_media') {
      media.push(body.fileId);
      return route.fulfill({
        json: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ5kAAAAASUVORK5CYII=',
      });
    }
    if (body.action === 'save_answers') saved = body.responses;
    if (body.action === 'submit_exam') {
      saved = body.responses;
      submitted = true;
    }
    if (body.action === 'released_result')
      return route.fulfill({ json: { correct: 1, percent: 100 } });
    return route.fulfill({ json: { locked: false, state: 'open', warning: '' } });
  });
  await page.goto('/e/browser-test');
  await expect(page.getByRole('button', { name: 'Mulai ujian' })).toBeEnabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Nama peserta' }).fill('Siswa Uji');
  await page.getByRole('button', { name: 'Mulai ujian' }).click();
  for (const alt of ['Gambar pertanyaan', 'Gambar jawaban A']) {
    await expect(page.getByRole('img', { name: alt })).toBeVisible();
    await expect
      .poll(() =>
        page.getByRole('img', { name: alt }).evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.getByRole('radio').first().check();
  await expect.poll(() => saved.q1).toBe('a');
  await page.reload();
  await expect(page.getByRole('radio').first()).toBeChecked();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Kirim jawaban' }).click();
  await expect(page.getByRole('status').first()).toHaveText('Jawaban terkirim.');
  await page.getByRole('button', { name: 'Lihat hasil' }).click();
  await expect(page.getByRole('status').first()).toHaveText('Nilai: 100%');
  expect(submitted).toBe(true);
  expect(media).toEqual(expect.arrayContaining(['question-picture', 'answer-picture']));
});
