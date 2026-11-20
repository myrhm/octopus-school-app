import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('uses one full-size theme control with a visible keyboard focus ring', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const theme = page.getByRole('combobox', { name: 'Tema tampilan' });
  const control = theme.locator('..');
  const selectBox = await theme.boundingBox();
  const controlBox = await control.boundingBox();
  expect(selectBox).not.toBeNull();
  expect(controlBox).not.toBeNull();
  expect(selectBox!.width).toBeCloseTo(controlBox!.width, 0);
  expect(selectBox!.height).toBeCloseTo(controlBox!.height, 0);
  await page.keyboard.press('Tab');
  for (
    let step = 0;
    step < 12 && !(await theme.evaluate((element) => element === document.activeElement));
    step++
  ) {
    await page.keyboard.press('Tab');
  }
  await expect(theme).toBeFocused();
  await expect(theme).toHaveCSS('outline-style', 'solid');
  await expect(theme).toHaveCSS('outline-width', '3px');
  await control.screenshot({ path: testInfo.outputPath('theme-control-focused.png') });
});

test('follows the system theme and persists an explicit choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const html = page.locator('html');
  const theme = page.getByRole('combobox', { name: 'Tema tampilan' });
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await theme.selectOption('light');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(theme).toHaveValue('light');
  await theme.selectOption('system');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('stays usable when preference storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Buka bank soal' }).click();
  await expect(page.getByRole('heading', { name: 'Bank soal', exact: true })).toBeVisible();
});

test('syncs theme preference across tabs', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/bank-soal');
  await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption('dark');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(other.getByRole('combobox', { name: 'Tema tampilan' })).toHaveValue('dark');
  await other.close();
});

test('opens a keyboard accessible dialog and restores focus on Escape', async ({ page }) => {
  await page.goto('/komponen');
  const trigger = page.getByRole('button', { name: 'Buka contoh dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('Tinjau sebelum melanjutkan');
  await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Tutup dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('keeps field errors associated and checkbox operable by keyboard', async ({ page }) => {
  await page.goto('/komponen');
  const input = page.getByRole('textbox', { name: 'Nama bank soal' });
  await input.fill('x'.repeat(41));
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/Gunakan paling banyak 40 karakter/);
  await input.fill('Matematika');
  await expect(page.getByText('Gunakan paling banyak 40 karakter.')).not.toBeVisible();
  const checkbox = page.getByRole('checkbox', { name: 'Tandai untuk ditinjau' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
});

test('resets the local draft search', async ({ page }) => {
  await page.goto('/bank-soal');
  await page.getByRole('searchbox', { name: 'Cari draft soal' }).fill('Matematika');
  await page.getByRole('button', { name: 'Reset filter' }).click();
  await expect(page.getByRole('searchbox', { name: 'Cari draft soal' })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Impor soal' })).toBeEnabled();
});

test('opens the mobile menu, contains focus, and closes after navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Buka navigasi' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Navigasi Octopus' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Pengaturan', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Tutup navigasi' })).toBeFocused();
  await dialog.getByRole('link', { name: 'Bank soal', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bank soal', exact: true })).toBeVisible();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.desktop-sidebar')).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`has no automated accessibility violations in ${theme} theme`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption(theme);
    for (const path of ['/', '/bank-soal', '/komponen', '/pengaturan']) {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    }
    await page.getByRole('button', { name: 'Tentang Octopus' }).click();
    await expect(page.locator('.modal-content')).toHaveCSS('opacity', '1');
    await expect(page.locator('.modal-overlay')).toHaveCSS('opacity', '1');
    const modalResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(modalResults.violations, JSON.stringify(modalResults.violations, null, 2)).toEqual([]);
    await page.keyboard.press('Escape');
    if (await page.getByRole('button', { name: 'Buka navigasi' }).isVisible()) {
      await page.getByRole('button', { name: 'Buka navigasi' }).click();
      await expect(page.locator('.modal-overlay')).toHaveCSS('opacity', '1');
      const menuResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(menuResults.violations, JSON.stringify(menuResults.violations, null, 2)).toEqual([]);
    }
  });

  test(`fits narrow screens and renders branded assets in ${theme} theme`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Tema tampilan' }).selectOption(theme);
    if (testInfo.project.name.startsWith('mobile'))
      await page.setViewportSize({ width: 360, height: 800 });
    for (const path of [
      '/',
      '/bank-soal',
      '/ujian',
      '/monitoring',
      '/nilai',
      '/pengaturan',
      '/komponen',
    ]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const images = page.locator('img:visible');
      for (const image of await images.all()) {
        await expect(image).toHaveJSProperty('complete', true);
        expect(
          await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
        ).toBeGreaterThan(0);
      }
      if (path === '/' || path === '/bank-soal')
        await page.screenshot({
          path: testInfo.outputPath(`${path === '/' ? 'overview' : 'bank'}-${theme}.png`),
          fullPage: true,
        });
    }
  });
}
