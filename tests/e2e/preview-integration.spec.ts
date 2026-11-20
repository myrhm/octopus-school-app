import { expect, test } from '@playwright/test';

test('previews real extracted options after reorder and reload without changing the draft', async ({
  page,
}, info) => {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.click();
  await editor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      'text/html',
      '<p>Apa ibu kota Indonesia?</p><p>A. Bandung</p><p><strong>B. Jakarta</strong></p><p>C. Surabaya</p>',
    );
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  });
  await editor.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let first: Text | undefined, last: Text | undefined;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.data === 'A. Bandung') first = node;
      if (node.data === 'C. Surabaya') last = node;
    }
    if (!first || !last) throw new Error('Missing option text');
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(last, last.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Ekstrak beberapa opsi', exact: true }).click();
  await expect(page.locator('.answer-option-card')).toHaveCount(3);
  await page.getByRole('radio', { name: /^Opsi B/ }).check();
  const correctId = await page.locator('.answer-option-card').nth(1).getAttribute('data-option-id');
  await page.getByRole('button', { name: 'Naikkan opsi B', exact: true }).click();
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.answer-option-card').first()).toHaveAttribute(
    'data-option-id',
    correctId!,
  );
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
  const draftId = page.url().split('/').at(-1)!;
  const readDraft = () =>
    page.evaluate(async (id) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('octopus-local-drafts', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<string>((resolve, reject) => {
          const tx = db.transaction('drafts', 'readonly');
          const req = tx.objectStore('drafts').get(id);
          tx.oncomplete = () => resolve(JSON.stringify(req.result));
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    }, draftId);
  const before = await readDraft();
  await page.getByRole('link', { name: 'Kembali ke bank soal', exact: true }).click();
  await page.getByRole('link', { name: 'Pratinjau siswa', exact: true }).click();
  await expect(page.getByText('Apa ibu kota Indonesia?', { exact: true })).toBeVisible();
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(3);
  await expect(radios.nth(0)).toHaveAccessibleName(/Jakarta/);
  await expect(radios.nth(0)).toHaveValue(correctId!);
  await expect(radios.nth(1)).toHaveAccessibleName(/Bandung/);
  await expect(page.locator('.preview-option').first().locator('.preview-bold')).toHaveText(
    'Jakarta',
  );
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.getByText(/Kunci jawaban|jawaban benar|jawaban salah/i)).toHaveCount(0);
  expect(await page.locator('main').innerHTML()).not.toMatch(
    /correctOptionId|optionSources|keyConflictIds|optionAnchor/,
  );
  await radios.nth(1).check();
  await expect(radios.nth(1)).toBeChecked();
  expect(await readDraft()).toBe(before);
  await page.screenshot({ path: info.outputPath('real-option-preview.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  expect(await readDraft()).toBe(before);
  await page.getByRole('link', { name: 'Kembali ke bank soal', exact: true }).click();
  await page.getByRole('link', { name: 'Lanjutkan draft', exact: true }).click();
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
  await expect(page.locator('.answer-option-card').first()).toHaveAttribute(
    'data-option-id',
    correctId!,
  );
});
