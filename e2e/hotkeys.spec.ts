import { test, expect, type Page } from '@playwright/test';

async function key(page: Page, code: string, keyValue: string, modifiers: Record<string, boolean> = {}) {
  await page.evaluate(({ code, keyValue, modifiers }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code, key: keyValue, bubbles: true, cancelable: true, ...modifiers,
    }));
  }, { code, keyValue, modifiers });
}

test('tool and clipboard shortcuts work with Cyrillic key values', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  const tools = [
    ['KeyF', 'а', 'Фрейм'],
    ['KeyH', 'р', 'Рука'],
    ['KeyR', 'к', 'Прямоугольник'],
    ['KeyO', 'щ', 'Эллипс'],
    ['KeyT', 'е', 'Текст'],
    ['KeyI', 'ш', 'Изображение'],
    ['KeyV', 'м', 'Выделение'],
  ] as const;
  for (const [code, value, name] of tools) {
    await key(page, code, value);
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }

  await page.locator('.layer-row').filter({ hasText: /^Карточка$/ }).click();
  await key(page, 'KeyC', 'с', { ctrlKey: true });
  await key(page, 'KeyV', 'м', { ctrlKey: true });
  await expect(page.locator('.count-badge')).toHaveText('8');
});

test('zoom digit shortcuts and Space work independently of keyboard layout', async ({ page }) => {
  await page.goto('/?hitLayer=1');
  const initialZoom = await page.locator('.zoom-value').textContent();
  await key(page, 'Equal', '+');
  await expect(page.locator('.zoom-value')).not.toHaveText(initialZoom!);
  await key(page, 'Digit0', '0');
  await expect(page.locator('.zoom-value')).toHaveText('100%');
  await page.locator('.layer-row').filter({ hasText: /^Карточка$/ }).click();
  const beforeFit = await page.locator('.zoom-value').textContent();
  await key(page, 'Digit2', '@', { shiftKey: true });
  await expect(page.locator('.zoom-value')).not.toHaveText(beforeFit!);
  await key(page, 'Digit1', '!', { shiftKey: true });
  await expect(page.locator('.zoom-value')).toHaveText('85%');
  await key(page, 'Space', ' ');
  await expect(page.locator('.canvas-viewport')).toHaveClass(/is-hand/);
});
