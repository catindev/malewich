import { test, expect, type Page } from '@playwright/test';

type Node = Record<string, unknown>;

function base(id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null = null) {
  return { id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false, stroke: 'transparent', strokeWidth: 0 };
}

function frame(id: string, name: string, x = 0, width = 300, height = 200): Node {
  return { ...base(id, name, x, 0, width, height), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: true };
}

async function seed(page: Page, nodes: Node[], preserveSavedGeometry = false) {
  const doc = {
    version: 1, id: 'interface-doc', name: 'Interface', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    nodes, preserveSavedGeometry,
  };
  await page.addInitScript((document) => localStorage.setItem('malewich:document:v1', JSON.stringify(document)), doc);
  await page.goto('/?hitLayer=1');
  await expect(page.locator('.editor-svg')).toBeVisible();
}

test('creates isolated pages, duplicates a hierarchy and deletes only the copy', async ({ page }) => {
  await seed(page, [frame('screen-a', 'Screen A')]);
  await page.getByRole('button', { name: 'Новая страница' }).click();
  await expect(page.locator('.page-row.is-active')).toContainText('Страница 2');
  await page.locator('.page-row.is-active').dblclick();
  await page.getByLabel('Название страницы').fill('Дизайн');
  await page.getByLabel('Название страницы').press('Enter');
  await expect(page.locator('.page-row.is-active')).toContainText('Дизайн');
  await expect(page.locator('.canvas-empty-state')).toBeVisible();
  await page.getByRole('button', { name: 'Создать фрейм' }).click();
  await page.getByLabel('Название слоя').fill('Second screen');
  await page.getByLabel('Название слоя').press('Enter');
  await expect(page.locator('.layer-row')).toHaveCount(1);

  await page.locator('[data-page-id="page-1"]').click();
  await expect(page.locator('[data-layer-id="screen-a"]')).toBeVisible();
  await expect(page.locator('.layer-row')).toHaveCount(1);
  const firstPage = page.locator('[data-page-id="page-1"]');
  await firstPage.hover();
  await firstPage.getByTitle('Дублировать страницу').click();
  await expect(page.locator('.page-row.is-active')).toContainText('Страница 1 копия');
  await expect(page.locator('.layer-name')).toHaveText('Screen A копия');
  const duplicatedPage = page.locator('.page-row.is-active');
  await duplicatedPage.hover();
  await duplicatedPage.getByTitle('Удалить страницу').click();
  await page.locator('[data-page-id="page-1"]').click();
  await expect(page.locator('.layer-name')).toHaveText('Screen A');
});

test('groups pages, renames a group and keeps pages when the group is removed', async ({ page }) => {
  await seed(page, [frame('screen-a', 'Screen A')]);
  await page.getByRole('button', { name: 'Новая страница' }).click();
  await page.getByRole('button', { name: 'Новая группа страниц' }).click();
  await page.locator('.page-group-header > span').dblclick();
  await page.getByLabel('Название группы страниц').fill('Продукт');
  await page.getByLabel('Название группы страниц').press('Enter');
  const group = page.locator('.page-group');
  await group.getByTitle('Добавить страницу в группу').click();
  await expect(group.locator('.page-row')).toHaveCount(1);
  await page.locator('[data-page-id="page-1"]').dragTo(group.locator('.page-group-header'));
  await expect(group.locator('.page-row')).toHaveCount(2);
  await group.locator('.page-group-header').hover();
  await group.getByTitle('Удалить группу, оставив страницы').click();
  await expect(page.locator('.page-group')).toHaveCount(0);
  await expect(page.locator('.page-row')).toHaveCount(3);
});

test('expands and scrolls the layer tree to a canvas selection', async ({ page }) => {
  const nodes: Node[] = [];
  let parentId: string | null = null;
  for (let index = 0; index < 26; index += 1) {
    const id = `frame-${index}`;
    nodes.push({ ...base(id, `Frame ${index}`, 0, 0, 500, 400, parentId), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: false });
    parentId = id;
  }
  nodes.push({
    ...base('deep-text', 'Deep text', 40, 40, 200, 40, parentId), type: 'text', fill: '#202020', text: 'Deep text',
    fontSize: 20, fontFamily: 'Arial, sans-serif', fontWeight: 400, lineHeight: 1.2, letterSpacing: 0, textAlign: 'left',
  });
  await seed(page, nodes, true);
  await expect(page.locator('[data-layer-id="deep-text"]')).toHaveCount(0);
  await page.locator('[data-node-id="deep-text"]').click({ modifiers: ['Control'] });
  const selected = page.locator('[data-layer-id="deep-text"]');
  await expect(selected).toBeVisible();
  await expect(selected).toHaveClass(/is-selected/);
  await expect.poll(() => selected.evaluate((row) => {
    const bounds = row.getBoundingClientRect();
    const tree = document.querySelector('.layers-tree')!.getBoundingClientRect();
    return bounds.top >= tree.top - 1 && bounds.bottom <= tree.bottom + 1;
  })).toBe(true);
});

test('shows component and Auto Layout identity in layers and inspector', async ({ page }) => {
  const layout = {
    ...frame('card', 'Card'),
    autoLayout: { direction: 'horizontal', gap: 16, padding: { top: 0, right: 0, bottom: 0, left: 0 }, align: 'start', justify: 'start', hug: false },
  };
  await seed(page, [layout]);
  await page.locator('[data-layer-id="card"]').click();
  await expect(page.locator('[data-layer-id="card"]')).toHaveAttribute('data-node-kind', 'Auto Layout · горизонтальный');
  await expect(page.locator('.node-type-pill.is-auto-layout')).toContainText('Auto Layout');
  await page.getByRole('button', { name: '◇ Создать компонент' }).click();
  await expect(page.locator('[data-layer-id="card"]')).toHaveAttribute('data-node-kind', 'Main component');
  await expect(page.locator('.node-type-pill.is-main')).toContainText('Main component');
  await page.getByRole('button', { name: '＋ Создать instance' }).click();
  await expect(page.locator('.layer-row.is-instance')).toHaveCount(1);
  await expect(page.locator('.node-type-pill.is-instance')).toContainText('Instance');
});

test('presentation starts from the selected screen and switches screens', async ({ page }) => {
  await seed(page, [frame('a', 'Screen A', 0), frame('b', 'Screen B', 500)]);
  await page.locator('[data-layer-id="b"]').click();
  await page.getByRole('button', { name: 'Презентация' }).click();
  await expect(page.locator('.prototype-frame')).toHaveAttribute('alt', 'Screen B');
  await page.getByLabel('Экран презентации').selectOption({ label: 'Screen A' });
  await expect(page.locator('.prototype-frame')).toHaveAttribute('alt', 'Screen A');
});

test('dark theme, panel shortcut and CSS syntax highlighting work together', async ({ page }) => {
  const layout = {
    ...frame('layout', 'Layout'),
    autoLayout: { direction: 'horizontal', gap: 24, padding: { top: 0, right: 0, bottom: 0, left: 0 }, align: 'start', justify: 'start', hug: false },
  };
  await seed(page, [layout]);
  await page.getByTitle('Тёмная тема').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('malewich:theme'))).toBe('dark');
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.layers-panel')).toHaveCount(0);
  await expect(page.locator('.inspector')).toHaveCount(0);
  await expect(page.locator('.tool-rail')).toBeVisible();
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.layers-panel')).toBeVisible();
  await expect(page.locator('.inspector')).toBeVisible();
  await page.locator('[data-layer-id="layout"]').click();
  await page.getByTitle('Dev Mode').click();
  await expect(page.locator('.dev-code')).toContainText('display: flex');
  await expect(page.locator('.token-property').filter({ hasText: 'display' })).toHaveCount(1);
  await expect(page.locator('.token-selector').filter({ hasText: '.layout' })).toHaveCount(1);
});
