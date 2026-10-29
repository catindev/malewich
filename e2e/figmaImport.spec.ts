import { expect, test } from '@playwright/test';

const fixturePath = new URL('./fixtures/TCB.PAY.fig', import.meta.url).pathname;

test('imports TCB.PAY as editable vectors, text, components and variables', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(fixturePath);

  await expect(page.locator('.document-title')).toHaveValue('TCB.PAY', { timeout: 30_000 });
  await expect(page.locator('.brand-name')).toHaveText('malewich');
  await expect(page.locator('.count-badge')).toHaveText('2325');
  await expect(page.locator('.layer-row')).toHaveCount(55);
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await expect(page.locator('.scene-node--text')).toHaveCount(599);
  await expect(page.locator('.scene-node--vector')).toHaveCount(671);
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('500 15px Manrope'))).toBe(true);
  await expect.poll(() => page.evaluate(() => Array.from(document.fonts).some(
    (face) => face.family === 'Manrope' && face.weight === '400' && face.status === 'loaded',
  ))).toBe(true);

  await page.getByTitle('Вписать в экран').click();
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await expect(page.locator('.frame-label')).toHaveCount(0);
  // Element screenshots include overlays above the element. Hide the SVG grid
  // and hit layer so this assertion measures the WebGL pixels themselves.
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const canvasImage = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
  expect(canvasImage.byteLength).toBeGreaterThan(30_000);
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = ''; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = ''; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = ''; });
  await page.screenshot({ path: testInfo.outputPath('tcb-pay-full.png'), animations: 'disabled' });

  await page.locator('[data-layer-id="fig-0-253"]').click();
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: /Вписать выделение/ }).click();
  await expect(page.locator('.selection-overlay .selection')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('tcb-pay-first-screen.png'), animations: 'disabled' });

  for (const id of ['fig-0-4', 'fig-0-52', 'fig-0-53']) {
    await page.locator(`[data-layer-id="${id}"] .layer-disclosure`).click();
  }
  await page.locator('[data-layer-id="fig-0-804"]').click();
  await expect(page.locator('.component-status')).toContainText('Instance');
  await page.reload();
  await expect(page.locator('.document-title')).toHaveValue('TCB.PAY', { timeout: 30_000 });
  await expect(page.locator('.count-badge')).toHaveText('2325');
  await expect(page.locator('.scene-node--vector')).toHaveCount(671);
  expect(errors).toEqual([]);
});

test('text editing has one outline and migrates a legacy Forma snapshot', async ({ page }, testInfo) => {
  const now = new Date().toISOString();
  const doc = {
    version: 1, id: 'legacy-forma', name: 'Legacy project', createdAt: now, updatedAt: now,
    nodes: [{
      id: 'legacy-text', type: 'text', name: 'Legacy text', x: 0, y: 0, width: 360, height: 40,
      rotation: 0, opacity: 1, visible: true, locked: false, parentId: null,
      fill: '#202020', stroke: 'transparent', strokeWidth: 0, text: 'Редактируемый текст',
      fontSize: 24, fontFamily: 'Manrope', fontWeight: 500, lineHeight: 1.2, letterSpacing: 0,
      textAlign: 'left', autoSize: 'none',
    }],
  };
  await page.addInitScript((document) => {
    if (!localStorage.getItem('malewich:document:v1')) {
      localStorage.setItem('forma:document:v1', JSON.stringify(document));
    }
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.document-title')).toHaveValue('Legacy project');
  await page.locator('[data-node-id="legacy-text"]').dblclick();
  await expect(page.locator('.canvas-text-editor')).toBeVisible();
  await expect(page.locator('.selection-overlay .selection')).toHaveCount(0);
  await expect(page.locator('.selection-overlay .resize-handle')).toHaveCount(0);
  await expect(page.locator('.selection-overlay .rotation-handle')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('single-text-editing-outline.png'), animations: 'disabled' });

  await page.locator('.canvas-text-editor').fill('Текст изменён в Malewich');
  await page.locator('.canvas-text-editor').press('Escape');
  await expect(page.locator('.canvas-text-editor')).toHaveCount(0);
  await expect(page.locator('.selection-overlay .selection')).toHaveCount(1);
  await expect(page.locator('.layer-name')).toContainText('Текст изменён в Malewich');
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');

  const migration = await page.evaluate(() => ({
    current: localStorage.getItem('malewich:document:v1'),
    legacy: localStorage.getItem('forma:document:v1'),
  }));
  expect(migration.current).toContain('Legacy project');
  expect(migration.legacy).toBeNull();
  await page.reload();
  await expect(page.locator('.layer-name')).toContainText('Текст изменён в Malewich');
});
