import { test, expect, type Page } from '@playwright/test';

type Node = Record<string, unknown>;

function base(id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null = null) {
  return { id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false, stroke: 'transparent', strokeWidth: 0 };
}

function rectangle(id: string, name: string, x: number, y: number, width = 100, height = 100): Node {
  return { ...base(id, name, x, y, width, height), type: 'rectangle', fill: '#8b5cf6', cornerRadius: 0 };
}

function textNode(id: string, name: string, value: string, width: number, height: number, autoSize: string): Node {
  return {
    ...base(id, name, 0, 0, width, height), type: 'text', fill: '#202020', text: value,
    fontSize: 20, fontFamily: 'Arial, sans-serif', fontWeight: 400, lineHeight: 1.2,
    letterSpacing: 0, textAlign: 'left', autoSize,
  };
}

async function seed(page: Page, nodes: Node[]) {
  const doc = { version: 1, id: 'stage2-doc', name: 'Этап 2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes };
  await page.addInitScript((document) => localStorage.setItem('malewich:document:v1', JSON.stringify(document)), doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.editor-svg')).toBeVisible();
}

function property(page: Page, label: string) {
  return page.locator('label.number-field').filter({ hasText: new RegExp(`^${label}`) }).locator('input');
}

test('group resize scales objects and their relative positions', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0), rectangle('b', 'B', 200, 0)]);
  await page.locator('[data-node-id="a"]').click();
  await page.keyboard.down('Shift');
  await page.locator('[data-node-id="b"]').click();
  await page.keyboard.up('Shift');
  await expect(page.locator('.group-resize-handle')).toHaveCount(8);
  const zoom = Number((await page.locator('.zoom-value').textContent())!.replace('%', '')) / 100;
  const handle = await page.locator('.group-resize-handle').nth(4).boundingBox();
  if (!handle) throw new Error('Group resize handle not found');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 100, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  const scale = (300 + 100 / zoom) / 300;
  await page.locator('[data-node-id="a"]').click();
  expect(Number(await property(page, 'W').inputValue())).toBeCloseTo(100 * scale, 1);
  await page.locator('[data-node-id="b"]').click();
  expect(Number(await property(page, 'X').inputValue())).toBeCloseTo(200 * scale, 1);
});

test('group rotate rotates every object around the shared center', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0), rectangle('b', 'B', 200, 0)]);
  await page.locator('[data-node-id="a"]').click();
  await page.keyboard.down('Shift');
  await page.locator('[data-node-id="b"]').click();
  await page.keyboard.up('Shift');
  const handle = await page.locator('.group-selection .rotation-handle').boundingBox();
  const bounds = await page.locator('.group-selection > rect').boundingBox();
  if (!handle || !bounds) throw new Error('Group controls not found');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.locator('[data-node-id="a"]').click();
  await expect(property(page, 'Угол')).toHaveValue('90');
});

test('align and distribute commands move the complete selection', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0, 50), rectangle('b', 'B', 100, 20), rectangle('c', 'C', 400, 0, 50)]);
  await page.keyboard.press('Control+a');
  await page.getByTitle('Распределить по горизонтали').click();
  await page.locator('.layer-row').filter({ hasText: 'B' }).click();
  await expect(property(page, 'X')).toHaveValue('175');
  await page.keyboard.press('Control+a');
  await page.getByTitle('По левому краю').click();
  await page.locator('.layer-row').filter({ hasText: 'B' }).click();
  await expect(property(page, 'X')).toHaveValue('0');
});

test('resize snaps the moving edge to another object', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0), rectangle('b', 'B', 200, 0)]);
  await page.locator('[data-node-id="a"]').click();
  const zoom = Number((await page.locator('.zoom-value').textContent())!.replace('%', '')) / 100;
  const handle = await page.locator('.resize-handle').nth(3).boundingBox();
  if (!handle) throw new Error('Resize handle not found');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 104 * zoom, handle.y + handle.height / 2, { steps: 8 });
  await expect(page.locator('.smart-guide').first()).toHaveAttribute('stroke', '#ff4f9a');
  await page.mouse.up();
  await expect(property(page, 'W')).toHaveValue('200');
});

test('auto-height wraps text and fixed-size keeps its dimensions', async ({ page }) => {
  await seed(page, [textNode('t', 'Text', 'one', 60, 24, 'height')]);
  await page.locator('[data-node-id="t"]').click();
  await expect(property(page, 'H')).toHaveValue('24');
  await page.locator('[data-node-id="t"]').dblclick();
  await page.locator('.canvas-text-editor').fill('one two three four five six');
  await page.locator('.canvas-text-editor').press('Escape');
  expect(Number(await property(page, 'H').inputValue())).toBeGreaterThan(24);
  await page.getByLabel('Режим текста').selectOption('none');
  const fixedHeight = await property(page, 'H').inputValue();
  await page.locator('[data-node-id="t"]').dblclick();
  await page.locator('.canvas-text-editor').fill('many more words that should wrap without changing the fixed frame height');
  await page.locator('.canvas-text-editor').press('Escape');
  await expect(property(page, 'H')).toHaveValue(fixedHeight);
});

test('IndexedDB persists documents larger than the localStorage fallback', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  const source = `data:image/png;base64,${'A'.repeat(9 * 1024 * 1024)}`;
  const image = { ...base('image', 'Большое изображение', 0, 0, 300, 200), type: 'image', src: source, cornerRadius: 0 };
  const doc = { version: 1, id: 'large-doc', name: 'Большой проект', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes: [image] };
  await page.locator('input[type="file"][accept*=".fig"]').setInputFiles({ name: 'large.malewich.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await expect(page.locator('.document-title')).toHaveValue('Большой проект');
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');
  const storedLength = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open('malewich-editor', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const request = open.result.transaction('documents', 'readonly').objectStore('documents').get('current');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.nodes[0].src.length);
    };
  }));
  expect(storedLength).toBeGreaterThan(9 * 1024 * 1024);
  await page.reload();
  await expect(page.locator('.document-title')).toHaveValue('Большой проект');
  await expect(page.locator('.layer-name', { hasText: 'Большое изображение' })).toBeVisible();
});

test('context menu duplicates objects and creates a frame at the pointer', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0)]);
  await page.locator('[data-node-id="a"]').click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.locator('.canvas-context-menu button').filter({ hasText: 'Дублировать' }).click();
  await expect(page.locator('.count-badge')).toHaveText('2');
  await expect(page.getByRole('menu')).toHaveCount(0);
  const canvas = await page.locator('.editor-svg').boundingBox();
  if (!canvas) throw new Error('Canvas not found');
  await page.mouse.click(canvas.x + 20, canvas.y + 20, { button: 'right' });
  await page.locator('.canvas-context-menu button').filter({ hasText: 'Создать фрейм здесь' }).click();
  await expect(page.locator('.count-badge')).toHaveText('3');
});
