import { test, expect, type Page } from '@playwright/test';

type TestNode = Record<string, unknown>;

function base(id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null = null) {
  return {
    id, name, x, y, width, height, parentId, rotation: 0, opacity: 1,
    visible: true, locked: false, stroke: 'transparent', strokeWidth: 0,
  };
}

function rectangle(id: string, name: string, x: number, y: number, width = 100, height = 100, parentId: string | null = null): TestNode {
  return { ...base(id, name, x, y, width, height, parentId), type: 'rectangle', fill: '#8b5cf6', cornerRadius: 0 };
}

function frame(id: string, name: string, x: number, y: number, width = 400, height = 400): TestNode {
  return { ...base(id, name, x, y, width, height), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: true };
}

async function seed(page: Page, nodes: TestNode[]) {
  const doc = {
    version: 1, id: 'parity-doc', name: 'Проверка поведения',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes,
  };
  await page.addInitScript((document) => {
    localStorage.setItem('forma:document:v1', JSON.stringify(document));
  }, doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.editor-svg')).toBeVisible();
}

function property(page: Page, label: string) {
  return page.locator('label.number-field').filter({ hasText: new RegExp(`^${label}`) }).locator('input');
}

test('single click selects a frame and double click edits nested text in place', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  const text = page.locator('[data-node-id="welcome-title"]');
  await text.click();
  await expect(page.locator('.selected-node-heading input')).toHaveValue('Добро пожаловать');
  await text.dblclick();
  const editor = page.locator('.canvas-text-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue('Идеи начинаются\nс чистого холста.');
  const caret = await editor.evaluate((element: HTMLTextAreaElement) => element.selectionStart);
  expect(caret).toBe('Идеи начинаются\nс чистого холста.'.length);
  await editor.fill('Текст изменён на холсте');
  await editor.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(page.locator('.layer-name').filter({ hasText: 'Текст изменён на холсте' })).toBeVisible();
});

test('new text auto-sizes while typing and Cmd/Ctrl+Enter finishes editing', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  await page.getByRole('button', { name: 'Текст', exact: true }).click();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.click(canvas.x + 100, canvas.y + 100);
  const editor = page.locator('.canvas-text-editor');
  await editor.fill('A');
  const initialWidth = Number(await page.locator('.text-editor-object').getAttribute('width'));
  await editor.fill('A much longer line of text');
  const nextWidth = Number(await page.locator('.text-editor-object').getAttribute('width'));
  expect(nextWidth).toBeGreaterThan(initialWidth);
  await editor.press('Control+Enter');
  await expect(editor).toHaveCount(0);
});

test('marquee selects root objects and Shift adds another marquee', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0), rectangle('b', 'B', 300, 0)]);
  const a = await page.locator('[data-node-id="a"]').boundingBox();
  const b = await page.locator('[data-node-id="b"]').boundingBox();
  if (!a || !b) throw new Error('Shapes not found');
  await page.mouse.move(a.x - 30, a.y - 30);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width + 20, a.y + a.height + 20, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.selected-node-heading input')).toHaveValue('A');
  await page.keyboard.down('Shift');
  await page.mouse.move(b.x - 30, b.y - 30);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width + 20, b.y + b.height + 20, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('.multi-selection-heading')).toContainText('2');
});

test('arrows nudge and clipboard pastes in place', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0, 200, 100)]);
  await page.locator('[data-node-id="a"]').click();
  await page.keyboard.press('ArrowRight');
  await expect(property(page, 'X')).toHaveValue('1');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(property(page, 'Y')).toHaveValue('10');
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.locator('.selected-node-heading input')).toHaveValue('A копия');
  await expect(property(page, 'X')).toHaveValue('1');
  await expect(property(page, 'Y')).toHaveValue('10');
  await expect(page.locator('.count-badge')).toHaveText('2');
});

test('Shift resize preserves the original aspect ratio', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0, 200, 100)]);
  await page.locator('[data-node-id="a"]').click();
  const zoom = Number((await page.locator('.zoom-value').textContent())!.replace('%', '')) / 100;
  const handle = await page.locator('.resize-handle').nth(4).boundingBox();
  if (!handle) throw new Error('Resize handle not found');
  await page.keyboard.down('Shift');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 100, handle.y + handle.height / 2 + 10, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const expectedWidth = Math.round((200 + 100 / zoom) * 100) / 100;
  await expect(property(page, 'W')).toHaveValue(String(expectedWidth));
  expect(Number(await property(page, 'H').inputValue())).toBeCloseTo(expectedWidth / 2, 1);
});

test('moving an object snaps to edges and displays a smart guide', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0), rectangle('b', 'B', 200, 0)]);
  const shape = await page.locator('[data-node-id="a"]').boundingBox();
  if (!shape) throw new Error('Shape not found');
  const zoom = Number((await page.locator('.zoom-value').textContent())!.replace('%', '')) / 100;
  await page.mouse.move(shape.x + shape.width / 2, shape.y + shape.height / 2);
  await page.mouse.down();
  await page.mouse.move(shape.x + shape.width / 2 + 104 * zoom, shape.y + shape.height / 2, { steps: 8 });
  await expect(page.locator('.smart-guide').first()).toHaveAttribute('stroke', '#ff4f9a');
  await page.mouse.up();
  await expect(property(page, 'X')).toHaveValue('100');
  await expect(page.locator('.smart-guide')).toHaveCount(0);
});

test('Alt-drag duplicates an object', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0)]);
  const shape = await page.locator('[data-node-id="a"]').boundingBox();
  if (!shape) throw new Error('Shape not found');
  await page.keyboard.down('Alt');
  await page.mouse.move(shape.x + shape.width / 2, shape.y + shape.height / 2);
  await page.mouse.down();
  await page.mouse.move(shape.x + shape.width / 2 + 140, shape.y + shape.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(page.locator('.count-badge')).toHaveText('2');
  await expect(page.locator('.selected-node-heading input')).toHaveValue('A копия');
});

test('Shift+2 fits selection and Shift+wheel pans horizontally', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0, 200, 100), rectangle('b', 'B', 1000, 0)]);
  await page.locator('[data-node-id="a"]').click();
  const initialZoom = await page.locator('.zoom-value').textContent();
  await page.keyboard.press('Shift+2');
  await expect(page.locator('.zoom-value')).not.toHaveText(initialZoom!);
  const viewportTransform = page.locator('.editor-svg > g').first();
  const before = await viewportTransform.getAttribute('transform');
  const beforeValues = before!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number);
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.keyboard.down('Shift');
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, 100);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  const after = await viewportTransform.getAttribute('transform');
  const afterValues = after!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.slice(1).map(Number);
  expect(afterValues[0]).toBeLessThan(beforeValues[0]);
  expect(afterValues[1]).toBe(beforeValues[1]);
});

test('dragging a nested object outside its frame reparents it to the root', async ({ page }) => {
  await seed(page, [frame('f', 'Frame', 0, 0), rectangle('r', 'Nested', 100, 100, 100, 100, 'f')]);
  await page.keyboard.down('Control');
  await page.locator('[data-node-id="r"]').click();
  await page.keyboard.up('Control');
  const shape = await page.locator('[data-node-id="r"]').boundingBox();
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!shape || !canvas) throw new Error('Shape or canvas not found');
  await page.mouse.move(shape.x + shape.width / 2, shape.y + shape.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width - 45, canvas.y + canvas.height - 45, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('[data-node-id="f"] [data-node-id="r"]')).toHaveCount(0);
  await expect(page.locator('.editor-svg [data-node-id="r"]')).toHaveCount(1);
});

test('layer drag changes hierarchy without moving the object visually', async ({ page }) => {
  await seed(page, [
    frame('f', 'Frame', 0, 0),
    rectangle('r', 'Nested', 100, 100, 100, 100, 'f'),
    rectangle('root', 'Root', 600, 0),
  ]);
  const nestedLayer = page.locator('.layer-row').filter({ hasText: 'Nested' });
  const rootLayer = page.locator('.layer-row').filter({ hasText: 'Root' });
  await nestedLayer.dragTo(rootLayer);
  await expect(page.locator('[data-node-id="f"] [data-node-id="r"]')).toHaveCount(0);
  await expect(page.locator('.selected-node-heading input')).toHaveValue('Nested');
  await expect(property(page, 'X')).toHaveValue('100');
  await expect(property(page, 'Y')).toHaveValue('100');
});
