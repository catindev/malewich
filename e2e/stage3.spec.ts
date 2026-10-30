import { test, expect, type Page } from '@playwright/test';

type Node = Record<string, unknown>;

function base(id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null = null) {
  return { id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false, stroke: 'transparent', strokeWidth: 0 };
}

function rectangle(id: string, name: string, x: number, y: number, width = 100, height = 100, parentId: string | null = null): Node {
  return { ...base(id, name, x, y, width, height, parentId), type: 'rectangle', fill: '#8b5cf6', cornerRadius: 0 };
}

function frame(id: string, name: string, width = 300, height = 200): Node {
  return { ...base(id, name, 0, 0, width, height), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: true };
}

function text(id: string, name: string, value: string, y = 0): Node {
  return {
    ...base(id, name, 0, y, 200, 40), type: 'text', fill: '#202020', text: value,
    fontSize: 20, fontFamily: 'Arial, sans-serif', fontWeight: 400, lineHeight: 1.2,
    letterSpacing: 0, textAlign: 'left', autoSize: 'height',
  };
}

async function seed(page: Page, nodes: Node[]) {
  const doc = { version: 1, id: 'stage3-doc', name: 'Этап 3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes };
  await page.addInitScript((document) => localStorage.setItem('forma:document:v1', JSON.stringify(document)), doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.editor-svg')).toBeVisible();
}

function property(page: Page, label: string) {
  return page.locator('label.number-field').filter({ hasText: new RegExp(`^${label}`) }).locator('input');
}

function layer(page: Page, name: string) {
  return page.locator('.layer-row').filter({ hasText: new RegExp(`^${name}$`) });
}

test('Auto Layout arranges children and Hug Contents resizes the frame', async ({ page }) => {
  await seed(page, [frame('layout', 'Layout'), rectangle('a', 'A', 20, 30, 100, 100, 'layout'), rectangle('b', 'B', 180, 50, 100, 100, 'layout')]);
  await layer(page, 'Layout').click();
  await page.getByRole('button', { name: 'Добавить Auto Layout' }).click();
  await page.getByLabel('Направление layout').selectOption('horizontal');
  await layer(page, 'A').click();
  await expect(property(page, 'X')).toHaveValue('0');
  await expect(property(page, 'Y')).toHaveValue('0');
  await layer(page, 'B').click();
  await expect(property(page, 'X')).toHaveValue('116');
  await layer(page, 'Layout').click();
  await page.getByLabel('Hug Contents').check();
  await expect(property(page, 'W')).toHaveValue('216');
});

test('component instances preserve overrides and synchronize after reset', async ({ page }) => {
  await seed(page, [frame('card', 'Card'), rectangle('content', 'Content', 20, 30, 100, 80, 'card')]);
  await layer(page, 'Card').click();
  await page.getByRole('button', { name: '◇ Создать компонент' }).click();
  await page.getByRole('button', { name: '＋ Создать instance' }).click();
  await expect(page.locator('.component-status')).toContainText('Instance');
  await expect(page.locator('.scene-node--frame')).toHaveCount(2);

  const instanceChild = page.locator('.scene-node--rectangle').nth(1);
  await page.keyboard.down('Control');
  await instanceChild.click();
  await page.keyboard.up('Control');
  await expect(page.locator('.canvas-context-menu')).toHaveCount(0);
  await property(page, 'X').fill('55');
  await property(page, 'X').press('Enter');
  await expect(page.locator('.component-status')).toContainText('overrides: 1');

  await layer(page, 'Content').last().click();
  await property(page, 'X').fill('70');
  await property(page, 'X').press('Enter');
  await page.keyboard.down('Control');
  await instanceChild.click();
  await page.keyboard.up('Control');
  await expect(property(page, 'X')).toHaveValue('55');

  await page.locator('.scene-node--frame').nth(1).click();
  await page.getByRole('button', { name: 'Сбросить overrides' }).click();
  await page.keyboard.down('Control');
  await instanceChild.click();
  await page.keyboard.up('Control');
  await expect(property(page, 'X')).toHaveValue('110');
});

test('color styles update every linked object from the library', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0)]);
  await layer(page, 'A').click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  await page.getByTitle('Создать цветовой стиль').click();
  const styleColor = page.getByLabel('Стиль Color 1');
  await page.locator('.library-row').filter({ has: styleColor }).locator('.library-apply').click();
  await styleColor.evaluate((element: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, '#112233');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('.color-value').first()).toHaveValue('#112233');
});

test('text styles apply typography and propagate later edits', async ({ page }) => {
  await seed(page, [text('a', 'Source', 'Source text'), text('b', 'Target', 'Target text', 100)]);
  await layer(page, 'Source text').click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  await page.getByTitle('Создать текстовый стиль').click();
  await page.getByRole('button', { name: 'Слои', exact: true }).click();
  await layer(page, 'Target text').click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  const size = page.getByLabel('Размер стиля Text 1');
  await page.locator('.library-row').filter({ has: size }).locator('.library-apply').click();
  await size.fill('48');
  await size.press('Enter');
  await expect(property(page, 'Размер')).toHaveValue('48');
});

test('number and color variables update bound properties', async ({ page }) => {
  const layout = {
    ...frame('layout', 'Layout'),
    autoLayout: { direction: 'horizontal', gap: 16, padding: { top: 0, right: 0, bottom: 0, left: 0 }, align: 'start', justify: 'start', hug: false },
  };
  await seed(page, [layout, rectangle('child', 'Child', 0, 0, 100, 100, 'layout'), rectangle('swatch', 'Swatch', 500, 0)]);
  await layer(page, 'Layout').click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  await page.getByTitle('Добавить числовую переменную').click();
  await page.locator('.library-row').filter({ has: page.getByLabel('Переменная Number 1') }).locator('.library-apply').click();
  const number = page.getByLabel('Переменная Number 1');
  await number.fill('32');
  await number.press('Enter');
  await expect(property(page, 'Gap')).toHaveValue('32');

  await page.locator('[data-node-id="swatch"]').click();
  await page.getByTitle('Добавить цветовую переменную').click();
  const color = page.getByLabel('Переменная Color 1');
  await page.locator('.library-row').filter({ has: color }).locator('.library-apply').click();
  await color.evaluate((element: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, '#abcdef');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('.color-value').first()).toHaveValue('#abcdef');
});
