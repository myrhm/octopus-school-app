import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function openImport(page: Page) {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toBeVisible();
}

async function paste(page: Page, html: string, text: string) {
  const field = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await field.click();
  await field.evaluate(
    (element, content) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', content.html);
      clipboardData.setData('text/plain', content.text);
      element.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
      );
    },
    { html, text },
  );
}

test('creates and focuses a new question at the end or in an empty draft', async ({ page }) => {
  await openImport(page);
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.click();
  await editor.press('ControlOrMeta+Enter');
  await expect(page.locator('.question-card')).toHaveCount(2);
  await page.keyboard.type('Ikan Cakalang');
  await expect(page.locator('.question-card').last()).toContainText('Ikan Cakalang');
  await editor.press('ControlOrMeta+Enter');
  await expect(page.locator('.question-card')).toHaveCount(3);
  await page.keyboard.type('Habitat');
  await expect(page.locator('.question-card').last()).toContainText('Habitat');
  await page.getByRole('button', { name: 'Tambah soal', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(4);
  await page.keyboard.type('Soal tambahan');
  await expect(page.locator('.question-card').last()).toContainText('Soal tambahan');
});

for (const separator of ['Enter', 'Shift+Enter']) {
  test(`typing a delimiter after ${separator} opens the next question immediately`, async ({
    page,
  }) => {
    await openImport(page);
    const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
    await editor.click();
    await page.keyboard.type('Ikan Cakalang');
    await editor.press(separator);
    await page.keyboard.type('%%%');
    await expect(page.locator('.question-card')).toHaveCount(2);
    await expect(editor).not.toContainText('%%%');
    await expect(page.getByText('2 soal · Soal aktif 2', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
    await expect(page.locator('.question-card')).toHaveCount(1);
    await expect(editor).toContainText('Ikan Cakalang');
    await page.getByRole('button', { name: 'Ulangi', exact: true }).click();
    await expect(page.locator('.question-card')).toHaveCount(2);
    await expect(editor).toBeFocused();
    await page.keyboard.type('Pertanyaan berikutnya');
    await expect(page.locator('.question-card').last()).toContainText('Pertanyaan berikutnya');
    await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.question-card')).toHaveCount(2);
  });
}

test('consumes a pasted trailing soft-break delimiter, but keeps inline percent signs', async ({
  page,
}) => {
  await openImport(page);
  await paste(page, '<p>Use %%% in a sentence.<br>%%%</p>', 'Use %%% in a sentence.\n%%%');
  await page.getByRole('button', { name: 'Pisahkan dengan %%%', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(2);
  await expect(page.locator('.question-card').first()).toContainText('Use %%% in a sentence.');
  await expect(page.locator('.question-card').last().locator('p')).toHaveText('');
});

test('pastes, splits, merges, undoes, and reopens a local rich-text draft', async ({
  page,
}, info) => {
  await openImport(page);
  await page.getByRole('textbox', { name: 'Nama draft' }).fill('Matematika kelas 8');
  await paste(
    page,
    '<p><strong>1. Berapa hasil 12 × 3?</strong></p><p> A. 24</p><p> B. 36</p><p>%%%</p><p><em>2. Jelaskan jawabanmu.</em></p>',
    '1. Berapa hasil 12 × 3?\nA. 24\nB. 36\n%%%\n2. Jelaskan jawabanmu.',
  );
  await page.getByRole('button', { name: 'Pisahkan dengan %%%', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(2);
  await expect(page.locator('.question-card strong')).toHaveText('1. Berapa hasil 12 × 3?');
  await expect(page.locator('.question-card em')).toHaveText('2. Jelaskan jawabanmu.');
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText('%%%');
  await page.getByRole('button', { name: 'Ulangi', exact: true }).click();
  await page.locator('.question-card').last().click();
  await page.getByRole('button', { name: 'Gabung sebelumnya', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(2);
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Nama draft' })).toHaveValue('Matematika kelas 8');
  await expect(page.locator('.question-card')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('local-import.png'), fullPage: true });
  await page.getByRole('link', { name: 'Kembali ke bank soal', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Matematika kelas 8', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lanjutkan draft', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(2);
});

test('splits at the cursor with keyboard or touch controls', async ({ page }, info) => {
  await openImport(page);
  await paste(page, '<p>Alpha Beta</p>', 'Alpha Beta');
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.press('End');
  for (let index = 0; index < 5; index++) await editor.press('ArrowLeft');
  if (info.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: 'Pisahkan di kursor', exact: true }).click();
  } else await editor.press('ControlOrMeta+Enter');
  await expect(page.locator('.question-card')).toHaveCount(2);
  await expect(editor).toContainText('Alpha');
  await expect(editor).toContainText('Beta');
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(page.locator('.question-card')).toHaveCount(1);
});

test('prevents a stale tab from overwriting a newer draft', async ({ page, context }) => {
  await openImport(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('textbox', { name: 'Isi kumpulan soal' })).toBeVisible();
  await paste(page, '<p>Saved from first tab</p>', 'Saved from first tab');
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  await paste(other, '<p>Unsaved second tab</p>', 'Unsaved second tab');
  await expect(other.getByRole('alert')).toContainText('Draft berubah di tab lain');
  const download = other.waitForEvent('download');
  await other.getByRole('button', { name: 'Unduh salinan draft' }).click();
  expect((await download).suggestedFilename()).toMatch(/octopus-draft-.*\.json/);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).toContainText(
    'Saved from first tab',
  );
  await expect(page.getByRole('textbox', { name: 'Isi kumpulan soal' })).not.toContainText(
    'Unsaved second tab',
  );
  await other.close();
});

test('shows a recoverable error when draft storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/bank-soal');
  await expect(page.getByRole('heading', { name: 'Bank soal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  await expect(page.getByText('Draft belum dapat dibuat.', { exact: false })).toBeVisible();
});

test('keeps the editor accessible in both themes and at a narrow viewport', async ({
  page,
}, info) => {
  await openImport(page);
  await paste(page, '<p>Pertanyaan latihan</p>', 'Pertanyaan latihan');
  if (info.project.name.startsWith('mobile'))
    await page.setViewportSize({ width: 360, height: 800 });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption(theme);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  }
});
