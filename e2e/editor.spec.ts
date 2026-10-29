import { test, expect } from '@playwright/test';

test('creates, transforms and undoes a shape', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.document-title')).toHaveValue('Мой первый проект');
  await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.move(canvas.x + canvas.width * 0.55, canvas.y + canvas.height * 0.68);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.55 + 130, canvas.y + canvas.height * 0.68 + 90, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.layer-name', { hasText: 'Прямоугольник 2' })).toBeVisible();
  await expect(page.locator('.selected-node-heading input')).toHaveValue('Прямоугольник 2');
  const selection = await page.locator('.selection-overlay .selection').boundingBox();
  if (!selection) throw new Error('Selection not found');
  const overlays = (visible: boolean) => Promise.all([
    page.locator('.editor-svg').evaluate((svg, value) => { svg.style.visibility = value ? '' : 'hidden'; }, visible),
    page.locator('.canvas-grid').evaluate((grid, value) => { grid.style.visibility = value ? '' : 'hidden'; }, visible),
    page.locator('.canvas-mode-hint').evaluate((hint, value) => { hint.style.visibility = value ? '' : 'hidden'; }, visible),
  ]);
  await overlays(false);
  const beforeMove = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
  await overlays(true);
  await page.mouse.move(selection.x + selection.width / 2, selection.y + selection.height / 2);
  await page.mouse.down();
  await page.mouse.move(selection.x + selection.width / 2 + 70, selection.y + selection.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await overlays(false);
  const afterMove = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
  expect(beforeMove.equals(afterMove)).toBe(false);
  await page.getByTitle('Отменить (⌘Z)').click();
  await page.getByTitle('Отменить (⌘Z)').click();
  await expect(page.locator('.layer-name', { hasText: 'Прямоугольник 2' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('keeps nested absolute geometry aligned after moving a frame', async ({ page }, testInfo) => {
  const now = new Date().toISOString();
  const base = (id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null) => ({
    id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false,
    stroke: 'transparent', strokeWidth: 0,
  });
  const doc = {
    version: 1, id: 'nested-move', name: 'Nested move', createdAt: now, updatedAt: now,
    nodes: [
      { ...base('frame', 'Frame', 0, 0, 300, 200, null), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: false },
      { ...base('child', 'Child', 40, 50, 80, 60, 'frame'), type: 'rectangle', fill: '#ff0000', cornerRadius: 0 },
    ],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.getByTitle('Вписать в экран').click();
  const child = await page.locator('[data-node-id="child"]').boundingBox();
  if (!child) throw new Error('Child hit target not found');
  await page.mouse.move(child.x + child.width / 2, child.y + child.height / 2);
  await page.mouse.down();
  await page.mouse.move(child.x + child.width / 2 + 72, child.y + child.height / 2 + 36, { steps: 4 });
  await expect.poll(() => page.locator('.pixi-drag-scene').evaluate((canvas) => canvas.style.transform))
    .toContain('translate3d(72px, 36px, 0px)');
  await page.mouse.up();
  await expect(page.locator('.pixi-drag-scene')).toBeHidden();
  await expect(page.locator('label.number-field').filter({ hasText: /^X/ }).locator('input')).toHaveValue('48');
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');
  await page.getByTitle('Вписать в экран').click();
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const moved = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('nested-moved.png'), animations: 'disabled' });

  // Reload forces a full scene rebuild at the same saved coordinates. The
  // incremental frame move must produce exactly the same WebGL pixels.
  await page.reload();
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.getByTitle('Вписать в экран').click();
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const rebuilt = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('nested-rebuilt.png'), animations: 'disabled' });
  expect(moved.equals(rebuilt)).toBe(true);
});

test('edits text and restores the project after reload', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  await page.getByRole('button', { name: 'Текст', exact: true }).click();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.click(canvas.x + canvas.width * 0.45, canvas.y + canvas.height * 0.75);
  const editor = page.locator('.canvas-text-editor');
  await expect(editor).toBeVisible();
  await editor.fill('Тестовый заголовок');
  await page.locator('.document-title').click();
  await expect(page.locator('.layer-name', { hasText: 'Тестовый заголовок' })).toBeVisible();
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');
  await page.reload();
  await expect(page.locator('.layer-name', { hasText: 'Тестовый заголовок' })).toBeVisible();
});

test('exports SVG and PNG files', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  await page.getByRole('button', { name: 'Экспорт', exact: true }).click();
  const svgPromise = page.waitForEvent('download');
  await page.locator('.export-menu button').filter({ hasText: 'SVG' }).click();
  const svg = await svgPromise;
  expect(svg.suggestedFilename()).toBe('Мой-первый-проект.svg');
  expect(await svg.failure()).toBeNull();

  await page.getByRole('button', { name: 'Экспорт', exact: true }).click();
  const pngPromise = page.waitForEvent('download');
  await page.locator('.export-menu button').filter({ hasText: 'PNG' }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe('Мой-первый-проект@3x.png');
  expect(await png.failure()).toBeNull();
});

test('keeps panels fixed during canvas pan and zoom', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('passive event listener')) warnings.push(message.text());
  });
  await page.goto('/?hitLayer=1');
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  const panelPositions = () => page.evaluate(() => ({
    topbar: document.querySelector('.topbar')!.getBoundingClientRect().y,
    layers: document.querySelector('.layers-panel')!.getBoundingClientRect().y,
    inspector: document.querySelector('.inspector')!.getBoundingClientRect().y,
    windowScroll: window.scrollY,
  }));
  const initialPositions = await panelPositions();
  const initialZoom = await page.locator('.zoom-value').textContent();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  expect(await panelPositions()).toEqual(initialPositions);
  await expect(page.locator('.zoom-value')).toHaveText(initialZoom!);

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');
  await expect(page.locator('.zoom-value')).not.toHaveText(initialZoom!);
  expect(await panelPositions()).toEqual(initialPositions);
  expect(warnings).toEqual([]);
});

test('uses compositor panning and renders the final WebGL frame on release', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  const bounds = await page.locator('.editor-svg').boundingBox();
  if (!bounds) throw new Error('Canvas not found');
  const transform = () => page.locator('.pixi-scene').evaluate((canvas: HTMLCanvasElement) => canvas.style.transform);
  const initialZoom = await page.locator('.zoom-value').textContent();
  await page.keyboard.press('h');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 72, bounds.y + bounds.height / 2 + 36, { steps: 4 });
  await expect.poll(transform).toContain('translate3d(72px, 36px, 0px)');
  await page.mouse.up();
  await expect.poll(transform).toBe('');
  await expect(page.locator('.zoom-value')).toHaveText(initialZoom!);
});
