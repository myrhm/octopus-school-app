import { expect, test } from '@playwright/test';

test('navigates, reloads a nested URL, and returns with browser history', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Octopus');
  await page.getByRole('link', { name: 'Buka bank soal' }).click();
  await expect(page).toHaveURL(/\/bank-soal$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bank soal', exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Ruang untuk soal dan ujian Anda.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('recovers from an unknown URL', async ({ page }) => {
  await page.goto('/halaman-tidak-ada');
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke ringkasan' }).click();
  await expect(page).toHaveURL('/');
});
