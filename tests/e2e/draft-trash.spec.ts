import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('moves a draft to trash and restores its content after reload', async ({ page }) => {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nama draft' }).fill('Biologi');
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await editor.click();
  await page.keyboard.type('Habitat ikan cakalang');
  await expect(page.getByText('Tersimpan di browser ini', { exact: true })).toBeVisible();
  const editorUrl = page.url();
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Pindahkan ke sampah', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Lanjutkan draft' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sampah (1)', exact: true }).click();
  await page.reload();
  await expect(page.locator('.draft-list')).toContainText('Biologi');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto(editorUrl);
  await page.getByRole('link', { name: 'Buka Sampah', exact: true }).click();
  await page.getByRole('button', { name: 'Pulihkan draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sampah masih kosong' })).toBeVisible();
  await page.getByRole('button', { name: 'Draft aktif (1)', exact: true }).click();
  await page.getByRole('link', { name: 'Lanjutkan draft', exact: true }).click();
  await expect(editor).toContainText('Habitat ikan cakalang');
  await expect(page.getByRole('textbox', { name: 'Nama draft' })).toHaveValue('Biologi');
});

test('an open editor cannot resurrect a draft moved to trash in another tab', async ({
  page,
  context,
}) => {
  await page.goto('/bank-soal');
  await page.getByRole('button', { name: 'Impor soal', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Isi kumpulan soal' });
  await expect(editor).toBeVisible();
  const bank = await context.newPage();
  await bank.goto('/bank-soal');
  await bank.getByRole('button', { name: 'Pindahkan ke sampah', exact: true }).click();
  await expect(bank.getByRole('button', { name: 'Sampah (1)', exact: true })).toBeVisible();
  await editor.click();
  await page.keyboard.type('Perubahan tab lama');
  await expect(page.getByRole('alert')).toContainText('Draft sudah dipindahkan ke Sampah');
  await bank.reload();
  await expect(bank.getByRole('button', { name: 'Sampah (1)', exact: true })).toBeVisible();
  await expect(bank.getByRole('link', { name: 'Lanjutkan draft' })).toHaveCount(0);
});
