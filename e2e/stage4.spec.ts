import { test, expect, type Page } from '@playwright/test';

type Node = Record<string, unknown>;

function base(id: string, name: string, x: number, y: number, width: number, height: number, parentId: string | null = null) {
  return { id, name, x, y, width, height, parentId, rotation: 0, opacity: 1, visible: true, locked: false, stroke: 'transparent', strokeWidth: 0 };
}

function rectangle(id: string, name: string, x: number, y: number, width = 100, height = 100, parentId: string | null = null): Node {
  return { ...base(id, name, x, y, width, height, parentId), type: 'rectangle', fill: '#8b5cf6', cornerRadius: 0 };
}

function frame(id: string, name: string, x: number, width = 500, height = 200): Node {
  return { ...base(id, name, x, 0, width, height), type: 'frame', fill: '#ffffff', cornerRadius: 0, clip: true };
}

async function seed(page: Page, nodes: Node[]) {
  const doc = { version: 1, id: 'stage4-doc', name: 'Этап 4', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes };
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

test('Fill constraints resize children and respect max width', async ({ page }) => {
  const layout = {
    ...frame('layout', 'Layout', 0),
    autoLayout: { direction: 'horizontal', gap: 10, padding: { top: 10, right: 10, bottom: 10, left: 10 }, align: 'start', justify: 'start', hug: false },
  };
  const fill = {
    ...rectangle('fill', 'Fill', 0, 0, 100, 50, 'layout'),
    layout: { horizontal: 'fill', vertical: 'fill', absolute: false },
  };
  await seed(page, [layout, rectangle('fixed', 'Fixed', 0, 0, 100, 50, 'layout'), fill]);
  await layer(page, 'Fill').click();
  await expect(property(page, 'W')).toHaveValue('370');
  await expect(property(page, 'H')).toHaveValue('180');
  const maxWidth = property(page, 'MaxW');
  await maxWidth.fill('200');
  await maxWidth.press('Enter');
  await expect(property(page, 'W')).toHaveValue('200');
});

test('instance can switch between component variants', async ({ page }) => {
  await seed(page, [frame('card', 'Card', 0, 300, 200), rectangle('content', 'Content', 20, 30, 100, 80, 'card')]);
  await layer(page, 'Card').click();
  await page.getByRole('button', { name: '◇ Создать компонент' }).click();
  await page.getByRole('button', { name: '＋ Добавить вариант' }).click();
  await layer(page, 'Card').click();
  await page.getByRole('button', { name: '＋ Создать instance' }).click();
  const select = page.getByLabel('Вариант компонента');
  await expect(select).toHaveValue('card');
  await select.selectOption({ label: 'Variant 2' });
  await expect(select).not.toHaveValue('card');
  await expect(page.locator('.component-status')).toContainText('Instance');
});

test('Light and Dark modes update bound colors', async ({ page }) => {
  await seed(page, [rectangle('a', 'A', 0, 0)]);
  await layer(page, 'A').click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  await page.getByTitle('Добавить цветовую переменную').click();
  const color = page.getByLabel('Переменная Color 1');
  await page.locator('.library-row').filter({ has: color }).locator('.library-apply').click();
  const setColor = async (value: string) => {
    await color.evaluate((element: HTMLInputElement, next) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, next);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  };
  await setColor('#eeeeee');
  await page.getByLabel('Режим Default').selectOption({ label: 'Dark' });
  await setColor('#111111');
  await expect(page.getByLabel('Заливка: HEX')).toHaveValue('#111111');
  await page.getByLabel('Режим Default').selectOption({ label: 'Light' });
  await expect(page.getByLabel('Заливка: HEX')).toHaveValue('#eeeeee');
});

test('prototype follows a link and returns through history', async ({ page }) => {
  await seed(page, [frame('a', 'Screen A', 0, 300, 200), frame('b', 'Screen B', 500, 300, 200)]);
  await layer(page, 'Screen A').click();
  await page.getByRole('tab', { name: 'Прототип' }).click();
  await page.getByLabel('Цель перехода').selectOption({ label: 'Screen B' });
  await page.getByRole('button', { name: 'Презентация' }).click();
  await expect(page.getByRole('dialog', { name: 'Предпросмотр прототипа' })).toBeVisible();
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen A');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen B');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen A');
  await page.getByRole('button', { name: 'Дальше' }).click();
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen B');
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen A');
  await page.getByRole('button', { name: 'Закрыть предпросмотр' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Дизайн' }).click();
  await expect(page.locator('label.number-field').filter({ hasText: /^X/ }).locator('input')).toHaveValue('0');
});

test('Dev Mode displays generated CSS and tokens', async ({ page }) => {
  const layout = {
    ...frame('layout', 'Layout', 0),
    autoLayout: { direction: 'horizontal', gap: 24, padding: { top: 0, right: 0, bottom: 0, left: 0 }, align: 'start', justify: 'start', hug: false },
  };
  await seed(page, [layout]);
  await layer(page, 'Layout').click();
  await page.getByTitle('Dev Mode').click();
  await expect(page.locator('.dev-panel pre')).toContainText('display: flex');
  await expect(page.locator('.dev-panel pre')).toContainText('flex-direction: row');
  await expect(page.locator('.dev-panel pre')).toContainText('gap: 24px');
});

test('library search filters and drag inserts a component', async ({ page }) => {
  await seed(page, [frame('card', 'Card', 0, 300, 200)]);
  await layer(page, 'Card').click();
  await page.getByRole('button', { name: '◇ Создать компонент' }).click();
  await page.getByRole('button', { name: 'Библиотека', exact: true }).click();
  const search = page.getByLabel('Поиск в библиотеке');
  await search.fill('zzz');
  await expect(page.locator('.library-component')).toHaveCount(0);
  await search.fill('Card');
  await expect(page.locator('.library-component')).toHaveCount(1);
  await page.locator('.library-component').dragTo(page.locator('.editor-svg'), { targetPosition: { x: 700, y: 450 } });
  await expect(page.locator('.scene-node--frame')).toHaveCount(2);
  await expect(page.locator('.component-status')).toContainText('Instance');
});
