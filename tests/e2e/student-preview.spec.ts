import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('tries answers with keyboard and pointer, navigates, and resets on reload', async ({
  page,
}, info) => {
  await page.goto('/bank-soal');
  await page.getByRole('link', { name: 'Contoh pratinjau siswa' }).click();
  await expect(page.getByRole('heading', { name: 'Lingkungan di sekitar kita' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toHaveCount(0);
  await expect(page.locator('[contenteditable=true]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
  const radios = page.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByRole('heading', { name: 'Soal 2 dari 3' })).toBeFocused();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  // The full option card is a native label hit area, including its rich text.
  await page.locator('.preview-option').filter({ hasText: 'Kebiasaan sederhana' }).click();
  await expect(radios.nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Sebelumnya' }).click();
  await expect(radios.nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Hapus pilihan' }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  if (info.project.name.startsWith('mobile'))
    await page.getByRole('button', { name: 'Buka daftar 3 soal' }).click();
  await page.getByRole('button', { name: 'Soal 3, belum dipilih', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Soal 3 dari 3' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Berikutnya' })).toBeDisabled();
  await expect(page.getByText('Pilihan jawaban belum ditambahkan.')).toBeVisible();
  await expect(page.getByText(/benar|salah|kunci jawaban/i)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Soal 1 dari 3' })).toBeVisible();
  await expect(page.getByText('0 dari 3 soal sudah dipilih')).toBeVisible();
});

test('reads saved draft text without changing its revision or document', async ({ page }) => {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.fill('Pertanyaan tersimpan');
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  const readDraft = () =>
    page.evaluate(async (draftId) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('octopus-local-drafts', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        return await new Promise<string>((resolve, reject) => {
          const tx = db.transaction('drafts', 'readonly');
          const req = tx.objectStore('drafts').get(draftId);
          tx.oncomplete = () => resolve(JSON.stringify(req.result));
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    }, id);
  const before = await readDraft();
  await page.getByRole('link', { name: 'Kembali ke bank soal', exact: true }).click();
  await page.getByRole('link', { name: 'Pratinjau siswa', exact: true }).click();
  await expect(page.getByText('Pertanyaan tersimpan', { exact: true })).toBeVisible();
  await expect(page.getByText('Pilihan jawaban belum ditambahkan.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Pertanyaan tersimpan', { exact: true })).toBeVisible();
  expect(await readDraft()).toBe(before);
});

test('shows missing and unreadable drafts without replacing them with examples', async ({
  page,
}) => {
  await page.goto('/pratinjau-siswa/missing-draft');
  await expect(page.getByRole('heading', { name: 'Draft tidak ditemukan' })).toBeVisible();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pratinjau belum dapat dibuka' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.goto('/pratinjau-siswa/contoh');
  await expect(page.getByRole('radio')).toHaveCount(4);
});

test('is accessible in both themes and at narrow widths', async ({ page }, info) => {
  await page.goto('/pratinjau-siswa/contoh');
  await page.setViewportSize({
    width: info.project.name.startsWith('mobile') ? 360 : 1280,
    height: 900,
  });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption(theme);
    await page.getByRole('radio').nth(1).check();
    if (info.project.name.startsWith('mobile')) {
      const toggle = page.getByRole('button', { name: /daftar 3 soal/ });
      if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`student-preview-${theme}.png`),
      fullPage: true,
    });
  }
  // 640 CSS pixels covers desktop reflow at approximately 200% zoom.
  await page.setViewportSize({ width: 640, height: 450 });
  await expect(page.getByRole('button', { name: /daftar 3 soal/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
