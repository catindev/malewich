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
  await expect(page.locator('.canvas-viewport')).toHaveClass(/is-page-switching/);
  await expect.poll(() => page.locator('.canvas-viewport').evaluate((canvas) => getComputedStyle(canvas).filter)).not.toBe('none');
  await expect(page.locator('.canvas-viewport')).not.toHaveClass(/is-page-switching/);
  await expect(page.locator('.canvas-viewport')).toHaveCSS('filter', 'none');
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

test('uses a flat page list with drag ordering and a page context menu', async ({ page }) => {
  await seed(page, [frame('screen-a', 'Screen A')]);
  await expect(page.locator('.layers-panel .panel-tabs')).toHaveCount(1);
  await expect(page.locator('.layers-panel > .panel-tabs')).toHaveCount(0);
  await expect(page.locator('.layers-panel-header .count-badge')).toHaveText('1');
  await page.getByRole('button', { name: 'Новая страница' }).click();
  await expect(page.locator('.page-group')).toHaveCount(0);
  await expect(page.getByTitle('Новая группа страниц')).toHaveCount(0);
  const secondPageId = await page.locator('.page-row.is-active').getAttribute('data-page-id');
  await page.locator(`[data-page-id="${secondPageId}"]`).dragTo(page.locator('[data-page-id="page-1"]'));
  await expect(page.locator('.page-row')).toHaveText([/Страница 2/, /Страница 1/]);
  await page.locator('[data-page-id="page-1"]').click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menu').getByRole('button', { name: 'Переименовать' }).click();
  await page.getByLabel('Название страницы').fill('Основная');
  await page.getByLabel('Название страницы').press('Enter');
  await expect(page.locator('[data-page-id="page-1"]')).toContainText('Основная');
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
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen B');
  await expect(page.locator('.prototype-frame .scene-node--frame')).toHaveCount(1);
  await page.getByLabel('Экран презентации').selectOption({ label: 'Screen A' });
  await expect(page.locator('.prototype-frame')).toHaveAttribute('aria-label', 'Screen A');
});

test('dark theme, panel shortcut and CSS syntax highlighting work together', async ({ page }) => {
  const layout = {
    ...frame('layout', 'Layout'),
    autoLayout: { direction: 'horizontal', gap: 24, padding: { top: 0, right: 0, bottom: 0, left: 0 }, align: 'start', justify: 'start', hug: false },
  };
  await seed(page, [layout]);
  await page.getByTitle('Тёмная тема').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.canvas-grid circle')).toHaveCSS('fill', 'rgba(76, 92, 100, 0.28)');
  expect(await page.evaluate(() => localStorage.getItem('malewich:theme'))).toBe('dark');
  const persistentLayersPanel = await page.locator('.layers-panel').elementHandle();
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.layers-panel')).toBeHidden();
  await expect(page.locator('.inspector')).toBeHidden();
  await expect(page.locator('.tool-rail')).toBeHidden();
  await expect(page.locator('.canvas-mode-hint')).toBeHidden();
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.layers-panel')).toBeVisible();
  await expect(page.locator('.inspector')).toBeVisible();
  expect(await persistentLayersPanel?.evaluate((panel) => document.querySelector('.layers-panel') === panel)).toBe(true);
  await page.locator('[data-layer-id="layout"]').click();
  await page.getByTitle('Dev Mode').click();
  await expect(page.locator('.dev-code')).toContainText('display: flex');
  await expect(page.locator('.token-property').filter({ hasText: 'display' })).toHaveCount(1);
  await expect(page.locator('.token-selector').filter({ hasText: '.layout' })).toHaveCount(1);
});

test('keeps canvas pixels aligned when hiding every workspace panel', async ({ page }) => {
  await seed(page, [
    { ...base('target', 'Target', 0, 0, 100, 100), type: 'rectangle', fill: '#ff0000', cornerRadius: 0 },
    { ...base('exposed', 'Exposed', 1200, 0, 100, 100), type: 'rectangle', fill: '#0000ff', cornerRadius: 0 },
  ]);
  await expect(page.locator('.topbar')).toHaveCount(0);
  await expect(page.locator('.canvas-statusbar')).toHaveCount(0);
  await expect(page.locator('.project-controls .brand')).toBeVisible();
  await expect(page.locator('.project-controls .project-panel-toggle')).toBeVisible();
  await expect(page.locator('.action-controls .history-controls')).toBeVisible();
  await expect(page.locator('.action-controls .preview-button')).toBeVisible();
  await expect(page.locator('.action-controls .export-button')).toHaveCount(0);
  await expect(page.locator('.layers-footer-summary')).toHaveText('2 объектов');
  await expect(page.locator('.layers-footer .zoom-label')).toHaveText('масштаб');
  await page.getByTitle('Вписать в экран').click();
  await page.evaluate(async () => {
    const { useEditorStore } = await import('/src/store/editorStore.ts');
    useEditorStore.getState().setViewport({ zoom: 1, x: 100, y: 100 });
  });
  await expect(page.locator('.pixi-scene')).not.toHaveAttribute('data-zoom-preview', 'true');
  const readNodePixel = async (id: string) => {
    const target = await page.locator(`[data-node-id="${id}"]`).boundingBox();
    const canvas = await page.locator('.pixi-scene').boundingBox();
    if (!target || !canvas) throw new Error('Target or canvas missing');
    const screenshot = await page.locator('.pixi-scene').screenshot({ animations: 'disabled' });
    return page.evaluate(async ({ base64, point, size }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(
        Math.round(point.x * image.naturalWidth / size.width),
        Math.round(point.y * image.naturalHeight / size.height), 1, 1,
      ).data];
    }, {
      base64: screenshot.toString('base64'),
      point: { x: target.x + target.width / 2 - canvas.x, y: target.y + target.height / 2 - canvas.y },
      size: { width: canvas.width, height: canvas.height },
    });
  };
  const readCanvasSize = () => page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.pixi-scene')!;
    const dragCanvas = document.querySelector<HTMLCanvasElement>('.pixi-drag-scene')!;
    return {
      css: canvas.clientWidth,
      parent: canvas.parentElement!.clientWidth,
      bitmap: canvas.width,
      dragBitmap: dragCanvas.width,
    };
  });
  await expect.poll(readCanvasSize).toEqual({ css: 880, parent: 880, bitmap: 880, dragBitmap: 880 });
  await expect.poll(() => readNodePixel('target')).toEqual([255, 0, 0, 255]);
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.tool-rail')).toBeHidden();
  await expect(page.locator('.layers-panel')).toBeHidden();
  await expect(page.locator('.inspector')).toBeHidden();
  await expect(page.locator('.canvas-mode-hint')).toBeHidden();
  const bounds = await page.locator('.canvas-viewport').boundingBox();
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 1440, height: 960 });
  await expect.poll(readCanvasSize).toEqual({ css: 1440, parent: 1440, bitmap: 1440, dragBitmap: 1440 });
  await expect.poll(() => readNodePixel('target')).toEqual([255, 0, 0, 255]);
  await expect.poll(() => readNodePixel('exposed')).toEqual([0, 0, 255, 255]);
  await page.keyboard.press('Control+\\');
  await expect(page.locator('.tool-rail')).toBeVisible();
  await expect(page.locator('.layers-panel')).toBeVisible();
  await expect(page.locator('.inspector')).toBeVisible();
  await expect.poll(readCanvasSize).toEqual({ css: 880, parent: 880, bitmap: 880, dragBitmap: 880 });
  await expect.poll(() => readNodePixel('target')).toEqual([255, 0, 0, 255]);
});

test('changes and saves the active page background without changing other pages', async ({ page }) => {
  await seed(page, [frame('screen-a', 'Screen A')]);
  await page.getByLabel('Фон страницы: HEX').fill('#f3e8d3');
  await page.getByLabel('Фон страницы: HEX').press('Enter');
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(243, 232, 211)');
  await page.getByRole('button', { name: 'Новая страница' }).click();
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(237, 237, 237)');
  await page.locator('[data-page-id="page-1"]').click();
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(243, 232, 211)');
  await expect(page.locator('.save-indicator')).toContainText('Сохранено локально');
  await page.reload();
  await expect(page.locator('.canvas-viewport')).toHaveCSS('background-color', 'rgb(243, 232, 211)');
});

test('opens custom canvas and layer context menus including Control-click', async ({ page }) => {
  await seed(page, [frame('screen-a', 'Screen A')]);
  await page.locator('[data-node-id="screen-a"]').click({ button: 'right', modifiers: ['Control'] });
  await expect(page.locator('.canvas-context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-context-menu')).toHaveCount(0);
  await page.locator('[data-layer-id="screen-a"]').click({ button: 'right' });
  await expect(page.locator('.layer-context-menu')).toBeVisible();
  await page.locator('.layer-context-menu').getByRole('button', { name: 'Скрыть слой' }).click();
  await expect(page.locator('[data-layer-id="screen-a"]')).toHaveClass(/is-hidden/);
  await page.locator('.inspector-header').click({ button: 'right' });
  await expect(page.locator('.inspector .layer-context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.inspector .layer-context-menu')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.addEventListener('contextmenu', (event) => {
      document.documentElement.dataset.lastContextPrevented = String(event.defaultPrevented);
    });
  });
  await page.locator('.pages-header').click({ button: 'right' });
  await expect(page.locator('html')).toHaveAttribute('data-last-context-prevented', 'true');
  await page.locator('.inspector-header').click({ button: 'right' });
  await expect(page.locator('html')).toHaveAttribute('data-last-context-prevented', 'true');
  await expect(page.locator('.layer-context-menu')).toHaveCount(0);
});

test('runs Figma-like grouping, renaming, flipping and page moves from the layer menu', async ({ page }) => {
  await seed(page, [
    { ...base('first', 'First', 0, 0, 100, 100), type: 'rectangle', fill: '#ff0000', cornerRadius: 0 },
    { ...base('second', 'Second', 180, 0, 100, 100), type: 'rectangle', fill: '#0000ff', cornerRadius: 0 },
  ]);
  await page.locator('[data-layer-id="first"]').click();
  await page.locator('[data-layer-id="second"]').click({ modifiers: ['Shift'] });
  await page.locator('[data-layer-id="second"]').click({ button: 'right' });
  await page.locator('.layer-context-menu').getByRole('button', { name: /^Сгруппировать/ }).click();
  const group = page.locator('[data-node-kind="Группа"]');
  await expect(group).toBeVisible();
  const groupId = await group.getAttribute('data-layer-id');
  await expect.poll(() => page.evaluate(({ first, second, groupId }) => {
    const doc = JSON.parse(localStorage.getItem('malewich:document:v1')!);
    return [first, second].every((id) => doc.nodes.find((node) => node.id === id)?.parentId === groupId);
  }, { first: 'first', second: 'second', groupId })).toBe(true);

  await group.click({ button: 'right' });
  await page.locator('.layer-context-menu').getByRole('button', { name: 'Переименовать', exact: true }).click();
  await page.locator('.layer-name-input').fill('Objects');
  await page.locator('.layer-name-input').press('Enter');
  await expect(group).toContainText('Objects');
  await group.click({ button: 'right' });
  await page.locator('.layer-context-menu').getByRole('button', { name: 'Отразить по горизонтали', exact: true }).click();
  await expect.poll(() => page.evaluate((id) => {
    const doc = JSON.parse(localStorage.getItem('malewich:document:v1')!);
    return doc.nodes.find((node) => node.id === id)?.flipX;
  }, groupId)).toBe(true);

  await page.getByRole('button', { name: 'Новая страница' }).click();
  await expect(page.locator('.page-row.is-active')).toContainText('Страница 2');
  await page.locator('[data-page-id="page-1"]').click();
  await expect(page.locator('[data-page-id="page-1"]')).toHaveClass(/is-active/);
  await group.click();
  await group.click({ button: 'right' });
  await page.locator('.layer-context-menu').getByRole('button', { name: 'Перенести на страницу', exact: true }).click();
  await page.locator('.context-submenu').getByRole('button', { name: 'Страница 2', exact: true }).click();
  await expect(page.locator('.page-row.is-active')).toContainText('Страница 2');
  await expect(page.locator('[data-node-kind="Группа"]')).toContainText('Objects');
  await expect.poll(() => page.evaluate((id) => {
    const doc = JSON.parse(localStorage.getItem('malewich:document:v1')!);
    const node = doc.nodes.find((candidate) => candidate.id === id);
    return node?.parentId === null && node.pageId !== 'page-1';
  }, groupId)).toBe(true);
});
