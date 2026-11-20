import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function setup(
  page: Page,
  html = '<p>Apa ibu kota Indonesia?</p><p>A. Bandung</p><p><strong>B) Jakarta</strong></p><p>(C) Surabaya</p>',
) {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.evaluate((element, content) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', content);
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, html);
}

async function selectText(page: Page, start: string, end = start) {
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.focus();
  await editor.evaluate(
    (element, text) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let first: Text | undefined;
      let last: Text | undefined;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (!first && node.data.includes(text.start)) first = node;
        if (node.data.includes(text.end)) last = node;
      }
      if (!first || !last) throw new Error('Requested selection text was not found');
      const range = document.createRange();
      range.setStart(first, first.data.indexOf(text.start));
      range.setEnd(last, last.data.indexOf(text.end) + text.end.length);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    },
    { start, end },
  );
  await expect(page.getByRole('button', { name: 'Jadikan opsi', exact: true })).toBeEnabled();
}

test('extracts, reorders by ID, chooses a key, and resumes with all data intact', async ({
  page,
}, info) => {
  await setup(page);
  await selectText(page, 'A. Bandung', '(C) Surabaya');
  await page.getByRole('button', { name: 'Ekstrak beberapa opsi', exact: true }).click();
  const cards = page.locator('.answer-option-card');
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).not.toContainText(
    'Bandung',
  );
  await expect(cards.nth(1).locator('strong')).toHaveText('Jakarta');
  await page.getByRole('radio', { name: /^Opsi B/ }).check();
  const id = await cards.nth(1).getAttribute('data-option-id');
  await page.getByRole('button', { name: 'Naikkan opsi B', exact: true }).click();
  await expect(cards.first()).toHaveAttribute('data-option-id', id!);
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  await page.reload();
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute('data-option-id', id!);
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
  await page.screenshot({ path: info.outputPath('answer-options.png'), fullPage: true });
  await page.getByRole('button', { name: 'Kembalikan opsi A ke soal', exact: true }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText(
    'B) Jakarta',
  );
  await expect(page.getByText('Kunci jawaban belum dipilih.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /^Opsi A/ })).toBeChecked();
});

test('extracts a partial selection and undoes without losing surrounding text', async ({
  page,
}) => {
  await setup(page, '<p>Sebelum A. Jakarta sesudah</p>');
  await selectText(page, 'A. Jakarta');
  await page.getByRole('button', { name: 'Jadikan opsi', exact: true }).click();
  await expect(page.locator('.answer-option-content')).toHaveText('Jakarta');
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText(
    'Sebelum  sesudah',
  );
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(page.locator('.answer-option-card')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText(
    'Sebelum A. Jakarta sesudah',
  );
  await page.getByRole('button', { name: 'Ulangi', exact: true }).click();
  await expect(page.locator('.answer-option-card')).toHaveCount(1);
});

test('opens a legacy draft read-only and upgrades its storage version on the next edit', async ({
  page,
}) => {
  await setup(page);
  await selectText(page, 'A. Bandung', '(C) Surabaya');
  await page.getByRole('button', { name: 'Ekstrak beberapa opsi', exact: true }).click();
  await page.getByRole('radio', { name: /^Opsi B/ }).check();
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  const record = async (makeLegacy = false) =>
    page.evaluate(
      async ({ id, makeLegacy }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('octopus-local-drafts', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          return await new Promise<{ formatVersion: number; revision: number }>(
            (resolve, reject) => {
              const tx = db.transaction('drafts', makeLegacy ? 'readwrite' : 'readonly');
              const store = tx.objectStore('drafts');
              const request = store.get(id);
              request.onsuccess = () => {
                if (makeLegacy) {
                  request.result.formatVersion = 1;
                  store.put(request.result);
                }
              };
              tx.oncomplete = () =>
                resolve({
                  formatVersion: request.result.formatVersion,
                  revision: request.result.revision,
                });
              tx.onerror = () => reject(tx.error);
            },
          );
        } finally {
          db.close();
        }
      },
      { id, makeLegacy },
    );
  expect((await record()).formatVersion).toBe(2);
  const legacy = await record(true);
  await page.reload();
  await expect(page.locator('.answer-option-card')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /^Opsi B/ })).toBeChecked();
  expect(await record()).toEqual(legacy);
  await page.getByRole('textbox', { name: 'Nama draft' }).fill('Migrated draft');
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  const upgraded = await record();
  expect(upgraded.formatVersion).toBe(2);
  expect(upgraded.revision).toBeGreaterThan(legacy.revision);
  await page.reload();
  await expect(page.getByRole('radio', { name: /^Opsi B/ })).toBeChecked();
});

test('keeps ambiguous option text untouched and explains the manual fallback', async ({ page }) => {
  await setup(page, '<p>A. One</p><p>C. Three</p>');
  await selectText(page, 'A. One', 'C. Three');
  await page.getByRole('button', { name: 'Ekstrak beberapa opsi', exact: true }).click();
  await expect(page.getByText('Batas opsi ambigu.', { exact: false })).toBeVisible();
  await expect(page.locator('.answer-option-card')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText('A. One');
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText('C. Three');
});

test('keeps option controls accessible in both themes and mobile layout', async ({
  page,
}, info) => {
  await setup(page);
  await selectText(page, 'A. Bandung', '(C) Surabaya');
  await page.getByRole('button', { name: 'Ekstrak beberapa opsi', exact: true }).click();
  if (info.project.name.startsWith('mobile'))
    await page.setViewportSize({ width: 360, height: 800 });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption(theme);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  }
});
