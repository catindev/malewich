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

test('creates an editable line with a visible stroke and persists it', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.keyboard.press('l');
  await expect(page.getByRole('button', { name: 'Линия', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const beforeRender = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.move(canvas.x + 300, canvas.y + 300);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 520, canvas.y + 360, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('.layer-name', { hasText: 'Линия' })).toBeVisible();
  await expect(page.locator('.scene-node--line')).toHaveCount(1);
  const afterRender = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
  expect(beforeRender.equals(afterRender)).toBe(false);
  await expect.poll(() => page.evaluate(() => {
    const doc = JSON.parse(localStorage.getItem('malewich:document:v1')!);
    const line = doc.nodes.find((node: { type: string }) => node.type === 'line');
    return line && {
      hasLengthAndAngle: line.width > 0 && Math.abs(line.rotation) > 0,
      height: line.height,
    };
  })).toEqual({ hasLengthAndAngle: true, height: 0 });

  // WebGL uses a transparent hit layer; reload in SVG mode to verify the reference stroke.
  await page.goto('/?renderer=svg&hitLayer=1');
  await expect(page.locator('.scene-node--line path')).toHaveAttribute('stroke', '#202020');
  await page.locator('.layer-name', { hasText: 'Линия' }).click();
  const strokeInput = page.getByRole('textbox', { name: 'Обводка: HEX' });
  await strokeInput.fill('#ff0000');
  await strokeInput.press('Enter');
  await expect(page.locator('.scene-node--line path')).toHaveAttribute('stroke', '#ff0000');
});

test('edits line endpoints and cancels a draft with Escape', async ({ page }) => {
  await page.goto('/?renderer=svg&hitLayer=1');
  await page.keyboard.press('l');
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.move(canvas.x + 300, canvas.y + 300);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 500, canvas.y + 300, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.line-endpoint')).toHaveCount(2);
  await expect(page.locator('.selection-overlay .resize-handle')).toHaveCount(0);
  await expect(page.locator('.selection-overlay .rotation-handle')).toHaveCount(0);
  const length = page.getByRole('textbox', { name: 'Длина', exact: true });
  await length.fill('200');
  await length.press('Enter');
  const strokeWidth = page.getByRole('textbox', { name: 'Толщина', exact: true });
  await strokeWidth.fill('10');
  await strokeWidth.press('Enter');
  await expect(page.locator('.scene-node--line path')).toHaveAttribute('stroke-width', '10');
  const x1 = page.getByRole('textbox', { name: 'X1', exact: true });
  const initialLength = await length.inputValue();
  const initialX1 = await x1.inputValue();
  const endpoint = await page.locator('.line-endpoint[data-endpoint="end"]').boundingBox();
  if (!endpoint) throw new Error('Line endpoint not found');
  await page.mouse.move(endpoint.x + endpoint.width / 2, endpoint.y + endpoint.height / 2);
  await page.mouse.down();
  await page.mouse.move(endpoint.x + endpoint.width / 2 + 80, endpoint.y + endpoint.height / 2 + 60, { steps: 5 });
  await page.mouse.up();
  await expect(length).not.toHaveValue(initialLength);
  await expect(x1).toHaveValue(initialX1);
  await page.getByTitle('Отменить (⌘Z)').click();
  await expect(length).toHaveValue(initialLength);

  await page.keyboard.press('l');
  await page.mouse.move(canvas.x + 320, canvas.y + 380);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 500, canvas.y + 430, { steps: 3 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.scene-node--line')).toHaveCount(1);
  await expect(page.locator('.layer-name', { hasText: 'Линия' })).toHaveCount(1);
});

test('creates and edits arrow, polygon and star from the shape menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  const draw = async (x1: number, y1: number, x2: number, y2: number) => {
    await page.mouse.move(canvas.x + x1, canvas.y + y1);
    await page.mouse.down();
    await page.mouse.move(canvas.x + x2, canvas.y + y2, { steps: 5 });
    await page.mouse.up();
  };
  const renderScreenshot = async () => {
    await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
    await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
    const screenshot = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
    await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = ''; });
    await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = ''; });
    return screenshot;
  };

  await page.getByRole('button', { name: 'Выбрать фигуру' }).click();
  await page.getByRole('menuitemradio', { name: /Изображение/ }).click();
  await expect(page.getByRole('button', { name: 'Изображение', exact: true })).toHaveAttribute('aria-pressed', 'true');

  let previousRender = await renderScreenshot();
  await page.keyboard.press('Shift+L');
  await expect(page.getByRole('button', { name: 'Стрелка', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await draw(300, 300, 470, 340);
  await page.getByRole('checkbox', { name: 'Наконечник в начале' }).check();
  let nextRender = await renderScreenshot();
  expect(previousRender.equals(nextRender)).toBe(false);
  previousRender = nextRender;

  await page.getByRole('button', { name: 'Выбрать фигуру' }).click();
  await page.getByRole('menuitemradio', { name: 'Многоугольник' }).click();
  await expect(page.getByRole('button', { name: 'Многоугольник', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await draw(520, 300, 650, 430);
  const sides = page.getByRole('textbox', { name: 'Стороны', exact: true });
  await sides.fill('5');
  await sides.press('Enter');
  nextRender = await renderScreenshot();
  expect(previousRender.equals(nextRender)).toBe(false);
  previousRender = nextRender;

  await page.getByRole('button', { name: 'Выбрать фигуру' }).click();
  await page.getByRole('menuitemradio', { name: 'Звезда' }).click();
  await expect(page.getByRole('button', { name: 'Звезда', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await draw(700, 300, 850, 450);
  await expect(page.getByRole('button', { name: 'Звезда', exact: true })).toBeVisible();
  const points = page.getByRole('textbox', { name: 'Лучи', exact: true });
  await points.fill('6');
  await points.press('Enter');
  const innerRadius = page.getByRole('textbox', { name: /Внутренний радиус/ });
  await innerRadius.fill('50');
  await innerRadius.press('Enter');
  nextRender = await renderScreenshot();
  expect(previousRender.equals(nextRender)).toBe(false);

  await expect.poll(() => page.evaluate(() => {
    const doc = JSON.parse(localStorage.getItem('malewich:document:v1')!);
    return ['arrow', 'polygon', 'star'].every((type) => doc.nodes.some((node: { type: string }) => node.type === type));
  })).toBe(true);
  await page.goto('/?renderer=svg&hitLayer=1');
  await expect(page.locator('.scene-node--arrow path')).toBeVisible();
  await expect(page.locator('.scene-node--polygon path')).toBeVisible();
  await expect(page.locator('.scene-node--star path')).toBeVisible();
  expect(await page.locator('.scene-node--arrow path').evaluate((path) =>
    (path.getAttribute('d')?.match(/M/g) ?? []).length)).toBe(5);
  expect(await page.locator('.scene-node--polygon path').evaluate((path) =>
    (path.getAttribute('d')?.match(/L/g) ?? []).length)).toBe(4);
  expect(await page.locator('.scene-node--star path').evaluate((path) =>
    (path.getAttribute('d')?.match(/L/g) ?? []).length)).toBe(11);
  expect(errors).toEqual([]);
});

test('keeps retained views alive after group undo', async ({ page }) => {
  const now = new Date().toISOString();
  const base = (id: string, name: string, x: number) => ({
    id, type: 'rectangle', name, x, y: 0, width: 120, height: 80, rotation: 0,
    opacity: 1, visible: true, locked: false, parentId: null, pageId: 'page-1',
    fill: '#7357ff', stroke: 'transparent', strokeWidth: 0, cornerRadius: 8,
  });
  const doc = {
    version: 1, id: 'group-undo', name: 'Group undo', createdAt: now, updatedAt: now,
    nodes: [base('first', 'First', 0), base('second', 'Second', 180)],
    pages: [{ id: 'page-1', name: 'Страница 1' }], activePageId: 'page-1',
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.locator('[data-layer-id="first"]').click();
  await page.locator('[data-layer-id="second"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press('Meta+g');
  await expect(page.locator('[data-node-kind="Группа"]')).toHaveCount(1);
  await page.keyboard.press('Meta+z');
  await expect(page.locator('[data-layer-id="first"]')).toBeVisible();
  await expect(page.locator('[data-layer-id="second"]')).toBeVisible();
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
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
  const labelBefore = await page.locator('[data-frame-label-id="frame"]').boundingBox();
  if (!child || !labelBefore) throw new Error('Child hit target or frame label not found');
  await page.mouse.move(child.x + child.width / 2, child.y + child.height / 2);
  await page.mouse.down();
  await page.mouse.move(child.x + child.width / 2 + 72, child.y + child.height / 2 + 36, { steps: 4 });
  await expect.poll(() => page.locator('.pixi-drag-scene').evaluate((canvas) => canvas.style.transform))
    .toContain('translate3d(72px, 36px, 0px)');
  // Root-frame preview is compositor-only; the immutable document commits once on release.
  await expect(page.locator('label.number-field').filter({ hasText: /^X/ }).locator('input')).toHaveValue('0');
  const labelDuring = await page.locator('[data-frame-label-id="frame"]').boundingBox();
  expect(labelDuring?.x).toBeCloseTo(labelBefore.x + 72, 0);
  expect(labelDuring?.y).toBeCloseTo(labelBefore.y + 36, 0);
  await page.mouse.up();
  await expect(page.locator('.pixi-drag-scene')).toBeHidden();
  await expect(page.locator('label.number-field').filter({ hasText: /^X/ }).locator('input')).toHaveValue('48');
  const labelAfter = await page.locator('[data-frame-label-id="frame"]').boundingBox();
  expect(labelAfter?.x).toBeCloseTo(labelBefore.x + 72, 0);
  expect(labelAfter?.y).toBeCloseTo(labelBefore.y + 36, 0);
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');
  await page.getByTitle('Вписать в экран').click();
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const moved = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('nested-moved.png'), animations: 'disabled' });

  // Reload forces a full scene rebuild at the same saved coordinates. The
  // incremental frame move must produce exactly the same WebGL pixels.
  await page.reload();
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.getByTitle('Вписать в экран').click();
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const rebuilt = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('nested-rebuilt.png'), animations: 'disabled' });
  expect(moved.equals(rebuilt)).toBe(true);
});

test('uses text LOD only during a zoomed-out drag preview and restores full text on release', async ({ page }) => {
  const now = new Date().toISOString();
  const base = (id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null) => ({
    id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false,
    stroke: 'transparent', strokeWidth: 0,
  });
  const doc = {
    version: 1, id: 'preview-lod', name: 'Preview LOD', createdAt: now, updatedAt: now,
    nodes: [
      { ...base('frame', 'Frame', 0, 0, 400, 300, null), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: false },
      {
        ...base('text', 'Text', 40, 50, 180, 40, 'frame'), type: 'text', fill: '#202020', text: 'Transient preview',
        fontSize: 20, fontFamily: 'Arial, sans-serif', fontWeight: 400, lineHeight: 1.2, letterSpacing: 0, textAlign: 'left',
      },
    ],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '50%', exact: true }).click();
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-lod-text', '0');
  const frame = await page.locator('[data-node-id="frame"]').boundingBox();
  if (!frame) throw new Error('Frame hit target not found');
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width / 2 + 60, frame.y + frame.height / 2 + 30, { steps: 3 });
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-lod-text', '1');
  await page.mouse.up();
  await expect(page.locator('.pixi-drag-scene')).toBeHidden();
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-lod-text', '0');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-text-resolution', '1');
});

test('shares downsampled image textures and raises their resolution only when needed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const now = new Date().toISOString();
  const source = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000"><rect width="4000" height="3000" fill="#7357ff"/></svg>')}`;
  const image = (id: string, x: number) => ({
    id, name: id, x, y: 0, width: 100, height: 75, parentId: null, rotation: 0, opacity: 1,
    visible: true, locked: false, stroke: 'transparent', strokeWidth: 0, type: 'image', src: source, cornerRadius: 0,
  });
  const doc = {
    version: 1, id: 'image-buckets', name: 'Image buckets', createdAt: now, updatedAt: now,
    nodes: [image('first', 0), image('second', 200)],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-cache-entries', '1');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-buckets', '512');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-cache-bytes', String(512 * 384 * 4));
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '1600%', exact: true }).click();
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-buckets', '2048');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-cache-entries', '2');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-image-cache-bytes', String(512 * 384 * 4 + 2048 * 1536 * 4));
  expect(errors).toEqual([]);
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

test('rerasterizes text at the current zoom instead of stretching a blurry texture', async ({ page }, testInfo) => {
  await page.goto('/?hitLayer=1');
  await page.getByRole('button', { name: 'Текст', exact: true }).click();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.click(canvas.x + canvas.width * 0.45, canvas.y + canvas.height * 0.65);
  await page.locator('.canvas-text-editor').fill('Резкий текст на 400%');
  await page.locator('.canvas-text-editor').press('Escape');
  await expect(page.locator('[data-renderer="webgl"]')).toHaveAttribute('data-text-resolution', '1');
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '400%', exact: true }).click();
  await expect(page.locator('.zoom-value')).toHaveText('400%');
  await expect(page.locator('[data-renderer="webgl"]')).toHaveAttribute('data-text-resolution', '4');
  await page.screenshot({ path: testInfo.outputPath('sharp-text-400.png'), animations: 'disabled' });
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '6400%', exact: true }).click();
  await expect(page.locator('[data-renderer="webgl"]')).toHaveAttribute('data-text-resolution', '64');
  await expect(page.locator('[data-renderer="webgl"]')).not.toHaveAttribute('data-chunked-text', '0');
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await page.screenshot({ path: testInfo.outputPath('sharp-text-6400.png'), animations: 'disabled' });
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('[data-renderer="webgl"]')).toHaveAttribute('data-text-resolution', '1');
});

test('supports 25600% zoom with compositor preview and verified final pixels', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const now = new Date().toISOString();
  const doc = {
    version: 1, id: 'extreme-zoom', name: 'Extreme zoom', createdAt: now, updatedAt: now,
    nodes: [{
      id: 'target', type: 'rectangle', name: 'Target', x: 0, y: 0, width: 100, height: 100,
      rotation: 0, opacity: 1, visible: true, locked: false, parentId: null,
      fill: '#ff0000', stroke: 'transparent', strokeWidth: 0, cornerRadius: 0,
    }],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.locator('[data-layer-id="target"]').click();
  await page.keyboard.press('Shift+2');
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  const canvas = await page.locator('.canvas-viewport').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -40);
  await page.keyboard.up('Control');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-zoom-preview', 'true');
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');

  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '25600%', exact: true }).click();
  await expect(page.locator('.zoom-value')).toHaveText('25600%');
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-text-resolution', '256');
  await expect(page.locator('.pixi-scene')).toBeVisible();
  // A DOM node and a successful render call do not prove that WebGL produced
  // visible content. Sample the known solid target at the zoom anchor itself.
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const readCenterPixel = async (path?: string) => {
    const screenshot = await page.locator('.pixi-scene').screenshot({ path, animations: 'disabled' });
    return page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(
        Math.floor(image.naturalWidth / 2), Math.floor(image.naturalHeight / 2), 1, 1,
      ).data];
    }, screenshot.toString('base64'));
  };
  await expect.poll(() => readCenterPixel(testInfo.outputPath('webgl-25600.png'))).toEqual([255, 0, 0, 255]);
  await page.locator('.zoom-value').click();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('.pixi-scene')).toHaveAttribute('data-text-resolution', '1');
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await expect.poll(() => readCenterPixel()).toEqual([255, 0, 0, 255]);
  expect(errors).toEqual([]);
});

test('renders nonzero vector holes as transparent WebGL pixels', async ({ page }, testInfo) => {
  const now = new Date().toISOString();
  const doc = {
    version: 1, id: 'vector-hole', name: 'Vector hole', createdAt: now, updatedAt: now,
    nodes: [
      {
        id: 'frame', type: 'frame', name: 'Frame', x: 0, y: 0, width: 200, height: 200,
        rotation: 0, opacity: 1, visible: true, locked: false, parentId: null,
        fill: '#ffffff', stroke: 'transparent', strokeWidth: 0, cornerRadius: 0, clip: false,
      },
      {
        id: 'vector', type: 'vector', name: 'Vector', x: 50, y: 50, width: 100, height: 100,
        rotation: 0, opacity: 1, visible: true, locked: false, parentId: 'frame',
        fill: '#00539b', stroke: 'transparent', strokeWidth: 0, fillRule: 'nonzero',
        pathWidth: 100, pathHeight: 100,
        // The hole deliberately precedes the outer contour, as in the TKB logo.
        path: 'M25 25V75H75V25Z M0 0H100V100H0Z',
      },
    ],
  };
  await page.addInitScript((document) => {
    localStorage.setItem('malewich:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('[data-renderer="webgl"]')).toBeVisible();
  await page.getByTitle('Вписать в экран').click();
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  await page.locator('.editor-svg').evaluate((svg) => { svg.style.visibility = 'hidden'; });
  await page.locator('.canvas-grid').evaluate((grid) => { grid.style.visibility = 'hidden'; });
  await page.locator('.canvas-mode-hint').evaluate((hint) => { hint.style.visibility = 'hidden'; });
  const vector = await page.locator('[data-node-id="vector"]').boundingBox();
  const canvasBounds = await page.locator('.pixi-scene').boundingBox();
  if (!vector || !canvasBounds) throw new Error('Vector or canvas missing');
  const scale = vector.width / 100;
  const samples = {
    width: canvasBounds.width,
    height: canvasBounds.height,
    hole: { x: vector.x + 50 * scale - canvasBounds.x, y: vector.y + 50 * scale - canvasBounds.y },
    solid: { x: vector.x + 10 * scale - canvasBounds.x, y: vector.y + 10 * scale - canvasBounds.y },
  };
  const readColors = async () => {
    const screenshot = await page.locator('.pixi-scene').screenshot({ path: testInfo.outputPath('nonzero-vector-hole.png'), animations: 'disabled' });
    return page.evaluate(async ({ base64, geometry }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const read = (point: { x: number; y: number }) => [...context.getImageData(
        Math.round(point.x * image.naturalWidth / geometry.width),
        Math.round(point.y * image.naturalHeight / geometry.height), 1, 1,
      ).data];
      return { hole: read(geometry.hole), solid: read(geometry.solid) };
    }, { base64: screenshot.toString('base64'), geometry: samples });
  };
  await expect.poll(readColors).toEqual({ hole: [255, 255, 255, 255], solid: [0, 83, 155, 255] });
});

test('exports the selected object from the inspector with a preview and format settings', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.action-controls .export-button')).toHaveCount(0);
  await expect(page.locator('.export-properties')).toHaveCount(0);
  await page.locator('[data-layer-id="welcome-shape"]').click();
  await expect(page.locator('.export-properties')).toBeVisible();
  await expect(page.locator('.export-preview img')).toBeVisible();
  await expect.poll(() => page.locator('.export-preview img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  await page.getByLabel('Формат экспорта').selectOption('SVG');
  const svgPromise = page.waitForEvent('download');
  await page.locator('.object-export-button').click();
  const svg = await svgPromise;
  expect(svg.suggestedFilename()).toBe('Акцент.svg');
  expect(await svg.failure()).toBeNull();

  await page.getByLabel('Формат экспорта').selectOption('PNG');
  await page.getByLabel('Масштаб экспорта').selectOption('2');
  const pngPromise = page.waitForEvent('download');
  await page.locator('.object-export-button').click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toBe('Акцент@2x.png');
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
    projectControls: document.querySelector('.project-controls')!.getBoundingClientRect().y,
    actionControls: document.querySelector('.action-controls')!.getBoundingClientRect().y,
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
