import { test, expect } from '@playwright/test';

test('shows the Malewich mark and syncs interface branding with the theme', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Малевич — визуальный редактор');
  const mark = page.locator('.brand-mark');
  const favicon = page.locator('link[rel="icon"]');
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute('viewBox', '-4 -6 174 162');
  await expect(page.locator('.brand-name')).toHaveText('Малевич');
  await expect(page.locator('.brand-mark-canvas')).toHaveCSS('fill', 'rgb(22, 22, 22)');
  await expect(page.locator('.brand-mark-letter')).toHaveCSS('fill', 'rgb(255, 255, 255)');
  await expect(favicon).toHaveAttribute('href', '/favicon.svg');
  await expect(themeColor).toHaveAttribute('content', '#ffffff');
  const lightIcon = await page.request.get('/favicon.svg');
  expect(lightIcon.ok()).toBe(true);
  expect(lightIcon.headers()['content-type']).toContain('image/svg+xml');

  await page.getByTitle('Тёмная тема').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.brand-mark-canvas')).toHaveCSS('fill', 'rgb(245, 241, 235)');
  await expect(page.locator('.brand-mark-letter')).toHaveCSS('fill', 'rgb(22, 22, 22)');
  await expect(page.locator('.brand-mark-red')).toHaveCSS('fill', 'rgb(240, 90, 67)');
  await expect(favicon).toHaveAttribute('href', '/favicon-dark.svg');
  await expect(themeColor).toHaveAttribute('content', '#202021');
  const darkIcon = await page.request.get('/favicon-dark.svg');
  expect(darkIcon.ok()).toBe(true);
  expect(await darkIcon.text()).toContain('<title>Малевич</title>');

  await page.getByTitle('Светлая тема').click();
  await expect(favicon).toHaveAttribute('href', '/favicon.svg');
  await expect(themeColor).toHaveAttribute('content', '#ffffff');
});
