import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixturePath = fileURLToPath(new URL('./fixtures/TCB.PAY.fig', import.meta.url));
const smzFixturePath = fileURLToPath(new URL('./fixtures/TCB.PAY.SMZ.fig', import.meta.url));
const uiPrepButtonsFixturePath = fileURLToPath(new URL('./fixtures/UI Prep.Buttons.fig', import.meta.url));
const uiPrepCoverFixturePath = fileURLToPath(new URL('./fixtures/UI Prep.Cover.fig', import.meta.url));
const globbbFixturePath = fileURLToPath(new URL('./fixtures/Globbb.Pages.fig', import.meta.url));
const transitLinesFixturePath = fileURLToPath(new URL('./fixtures/Transit.Lines.fig', import.meta.url));
const bestProjectsFixturePath = fileURLToPath(new URL('./fixtures/BestProjects.Tracker.fig', import.meta.url));

async function pngPixel(page: import('@playwright/test').Page, png: Buffer, x: number, y: number) {
  return page.evaluate(async ({ data, px, py }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(px, py, 1, 1).data];
  }, { data: png.toString('base64'), px: x, py: y });
}

async function revealLayer(page: import('@playwright/test').Page, id: string) {
  await page.locator('.layers-tree').evaluate(async (tree, layerId) => {
    if (tree.querySelector(`[data-layer-id="${layerId}"]`)) return;
    for (let top = 0; top <= tree.scrollHeight; top += Math.max(1, tree.clientHeight)) {
      tree.scrollTop = top;
      const visible = await new Promise<boolean>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(Boolean(tree.querySelector(`[data-layer-id="${layerId}"]`)))));
      });
      if (visible) return;
    }
    throw new Error(`Layer ${layerId} is not reachable in the virtualized list`);
  }, id);
  await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
}

test('imports TCB.PAY as editable vectors, text, components and variables', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(fixturePath);

  await expect(page.locator('.document-title')).toHaveValue('TCB.PAY', { timeout: 30_000 });
  await expect(page.locator('.brand-name')).toHaveText('Малевич');
  await expect(page.locator('.count-badge')).toHaveText('2325');
  await expect(page.locator('.layers-tree')).toHaveAttribute('data-layer-count', '55');
  expect(await page.locator('.layer-row').count()).toBeLessThan(55);
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

  await revealLayer(page, 'fig-0-253');
  await page.locator('[data-layer-id="fig-0-253"]').click();
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: /Вписать выделение/ }).click();
  await expect(page.locator('.selection-overlay .selection')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('tcb-pay-first-screen.png'), animations: 'disabled' });

  for (const id of ['fig-0-4', 'fig-0-52', 'fig-0-53']) {
    await revealLayer(page, id);
    await page.locator(`[data-layer-id="${id}"] .layer-disclosure`).click();
  }
  await revealLayer(page, 'fig-0-804');
  await page.locator('[data-layer-id="fig-0-804"]').click();
  await expect(page.locator('.component-status')).toContainText('Instance');
  await page.reload();
  await expect(page.locator('.document-title')).toHaveValue('TCB.PAY', { timeout: 30_000 });
  await expect(page.locator('.count-badge')).toHaveText('2325');
  await expect(page.locator('.scene-node--vector')).toHaveCount(671);
  expect(errors).toEqual([]);
});

test('shows the second SMZ page and presents its selected screen', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(smzFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('TCB.PAY.SMZ', { timeout: 30_000 });
  await expect(page.locator('.page-row')).toHaveCount(2);
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-scene-page', 'fig-page-0');
  await page.evaluate(() => {
    const canvas = document.querySelector('.canvas-viewport')!;
    const destinationRow = document.querySelector('[data-page-id="fig-page-1"]')!;
    const observer = new MutationObserver(() => {
      if (!canvas.classList.contains('is-page-switching')) return;
      document.documentElement.dataset.smzBlurClass = 'true';
      requestAnimationFrame(() => {
        if (getComputedStyle(canvas).filter !== 'none') document.documentElement.dataset.smzBlurFilter = 'true';
      });
    });
    observer.observe(canvas, { attributes: true, attributeFilter: ['class'] });
    const rowObserver = new MutationObserver(() => {
      const scenePage = document.querySelector('.pixi-scene')?.getAttribute('data-scene-page');
      if (destinationRow.classList.contains('is-active') && scenePage !== 'fig-page-1') {
        document.documentElement.dataset.smzRowBeforeScene = 'true';
      }
    });
    rowObserver.observe(destinationRow, { attributes: true, attributeFilter: ['class'] });
  });
  await page.locator('[data-page-id="fig-page-1"]').click();
  await expect(page.locator('[data-page-id="fig-page-1"]')).toHaveClass(/is-active/);
  await expect(page.locator('html')).toHaveAttribute('data-smz-row-before-scene', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-smz-blur-class', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-smz-blur-filter', 'true');
  await expect(page.locator('.canvas-viewport')).not.toHaveClass(/is-page-switching/);
  await expect(page.locator('.canvas-viewport')).toHaveCSS('filter', 'none');
  await expect(page.locator('.count-badge')).toHaveText('2149');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-scene-page', 'fig-page-1');
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await revealLayer(page, 'fig-0-993');
  await page.locator('[data-layer-id="fig-0-993"]').click();
  await page.getByRole('button', { name: 'Презентация' }).click();
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', '00. Первая проверка');
  await expect.poll(() => page.locator('.prototype-frame .scene-node').count()).toBeGreaterThan(20);
  const bell = page.locator('.prototype-frame [data-node-id="fig-0-1000"] path');
  await expect(bell).toHaveAttribute('stroke', '#4c5c64');
  expect(await bell.getAttribute('d')).toContain('C');
  expect(await bell.getAttribute('d')).not.toBe('M0 0H18V18H0Z');
  await expect(page.locator('.prototype-frame [data-node-id="fig-0-3913"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const presentation = await page.locator('.prototype-stage').screenshot({ path: testInfo.outputPath('smz-presentation.png'), animations: 'disabled' });
  expect(presentation.byteLength).toBeGreaterThan(30_000);
  await page.getByRole('button', { name: 'Закрыть предпросмотр' }).click();
  await page.getByRole('tab', { name: 'Дизайн' }).click();
  await page.getByTitle('Вписать в экран').click();
  const canvas = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('smz-second-page.png'), animations: 'disabled' });
  expect(canvas.byteLength).toBeGreaterThan(30_000);
  expect(errors).toEqual([]);
});

test('imports UI Prep embedded images and falls back from SF Pro Text to local Inter', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=svg');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(uiPrepButtonsFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('UI Prep.Buttons', { timeout: 30_000 });
  await expect(page.locator('.count-badge')).toHaveText('210');
  await expect(page.locator('.scene-node--text')).toHaveCount(40);
  await expect(page.locator('.scene-node--image')).toHaveCount(3);
  const fontFamilies = await page.locator('.scene-node--text text').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('font-family')));
  expect(new Set(fontFamilies)).toEqual(new Set(['SF Pro Text, Inter, Arial, sans-serif']));
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('500 16px Inter'))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('ui-prep-buttons-svg.png'), animations: 'disabled' });
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально', { timeout: 30_000 });

  await page.goto('/?hitLayer=1');
  await expect(page.locator('.document-title')).toHaveValue('UI Prep.Buttons', { timeout: 30_000 });
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await expect(page.locator('.scene-node--text')).toHaveCount(40);
  await expect(page.locator('.scene-node--image')).toHaveCount(3);
  await expect.poll(() => page.locator('.pixi-scene').getAttribute('data-image-cache-bytes').then(Number)).toBeGreaterThan(0);
  const buttonsImageCacheBytes = Number(await page.locator('.pixi-scene').getAttribute('data-image-cache-bytes'));
  await page.screenshot({ path: testInfo.outputPath('ui-prep-buttons.png'), animations: 'disabled' });

  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(uiPrepCoverFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('UI Prep.Cover', { timeout: 30_000 });
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await expect(page.locator('.count-badge')).toHaveText('1');
  await expect(page.locator('.scene-node--image')).toHaveCount(1);
  await expect.poll(() => page.locator('.pixi-scene').getAttribute('data-image-cache-bytes').then(Number)).toBeGreaterThan(buttonsImageCacheBytes);
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  const cover = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('ui-prep-cover.png'), animations: 'disabled' });
  expect(cover.byteLength).toBeGreaterThan(30_000);
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = ''; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = ''; });
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально', { timeout: 30_000 });
  await page.reload();
  await expect(page.locator('.document-title')).toHaveValue('UI Prep.Cover', { timeout: 30_000 });
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await expect(page.locator('.scene-node--image')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('renders Globbb reflected illustrations with preserved vector geometry', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(globbbFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('Globbb.Pages', { timeout: 30_000 });
  await expect(page.locator('.count-badge')).toHaveText('95');
  await expect(page.locator('.scene-node--vector')).toHaveCount(56);
  const pictureTransform = await page.locator('[data-node-id="fig-0-45"]').getAttribute('transform');
  const vectorTransform = await page.locator('[data-node-id="fig-0-98"]').getAttribute('transform');
  expect(pictureTransform?.startsWith('matrix(-')).toBe(true);
  expect(vectorTransform?.startsWith('matrix(-')).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  const canvas = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('globbb-pages.png'), animations: 'disabled' });
  // Solid interiors from the reference: the reflected brain and the rotated arm.
  // Both points were background before their world transforms were corrected.
  expect(await pngPixel(page, canvas, 480, 430)).toEqual([230, 161, 200, 255]);
  expect(await pngPixel(page, canvas, 190, 440)).toEqual([178, 190, 131, 255]);
  expect(errors).toEqual([]);
});

test('imports Transit lines, stroke paints and independent Figma page backgrounds', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=svg');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(transitLinesFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('Transit.Lines', { timeout: 30_000 });
  await expect(page.locator('.page-row')).toHaveCount(2);
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(57, 72, 105)');
  await expect(page.locator('.scene-node--vector')).toHaveCount(789);
  expect(await page.locator('.scene-node--vector path[stroke-dasharray]').count()).toBeGreaterThan(0);
  expect(await page.locator('.scene-node--vector path[stroke-linecap="butt"]').count()).toBeGreaterThan(0);
  await page.locator('[data-page-id="fig-page-1"]').click();
  await expect(page.locator('[data-page-id="fig-page-1"]')).toHaveClass(/is-active/);
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(21, 61, 82)');
  expect(errors).toEqual([]);
});

test('imports BestProjects gradient paints and preserves page background through WebGL', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=svg');
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles(bestProjectsFixturePath);
  await expect(page.locator('.document-title')).toHaveValue('BestProjects.Tracker', { timeout: 30_000 });
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.scene-node--vector')).toHaveCount(2379);
  expect(await page.locator('.scene-node--vector path[fill^="url(#gradient-"]').count()).toBeGreaterThan(0);
  expect(await page.locator('.scene-node--vector path[stroke-linecap="round"]').count()).toBeGreaterThan(0);
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально', { timeout: 30_000 });
  await page.goto('/');
  await expect(page.locator('.document-title')).toHaveValue('BestProjects.Tracker', { timeout: 30_000 });
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 });
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect.poll(() => page.locator('.pixi-scene').screenshot().then((png) => png.byteLength)).toBeGreaterThan(30_000);
  expect(errors).toEqual([]);
});

test('text editing has one outline and restores a current snapshot', async ({ page }, testInfo) => {
  const now = new Date().toISOString();
  const doc = {
    version: 1, id: 'current-snapshot', name: 'Current project', createdAt: now, updatedAt: now,
    nodes: [{
      id: 'current-text', type: 'text', name: 'Current text', x: 0, y: 0, width: 360, height: 40,
      rotation: 0, opacity: 1, visible: true, locked: false, parentId: null,
      fill: '#202020', stroke: 'transparent', strokeWidth: 0, text: 'Редактируемый текст',
      fontSize: 24, fontFamily: 'Manrope', fontWeight: 500, lineHeight: 1.2, letterSpacing: 0,
      textAlign: 'left', autoSize: 'none',
    }],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.document-title')).toHaveValue('Current project');
  await page.locator('[data-node-id="current-text"]').dblclick();
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

  const current = await page.evaluate(() => localStorage.getItem('malewich:document:v1'));
  expect(current).toContain('Current project');
  await page.reload();
  await expect(page.locator('.layer-name')).toContainText('Текст изменён в Malewich');
});
