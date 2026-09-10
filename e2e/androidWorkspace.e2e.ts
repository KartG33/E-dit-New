import { test, expect } from './fixtures';

test('compact navigation, independent symbol panels and accessible search controls', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  await editor.fill('Some **text**, with symbols.\nSecond line.');
  const card = editor.locator('..').locator('..');
  const decoration = await card.evaluate(el => {
    const style = getComputedStyle(el);
    return { border: style.borderColor, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), shadow: style.boxShadow };
  });
  expect(decoration.shadow).toBe('none');
  expect(decoration.border).not.toBe('rgb(101, 168, 255)');

  for (const width of [360, 393, 412, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const controls = page.locator('.ui-header-row button:visible');
    await expect(controls).toHaveCount(7);
    const boxes = await controls.evaluateAll(items => items.map(item => {
      const box = item.getBoundingClientRect(); return { x: box.x, right: box.right, y: box.y, height: box.height };
    }));
    expect(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y))).toBeLessThanOrEqual(5);
    expect(boxes.every(box => box.x >= 0 && box.right <= width && box.height >= 44)).toBe(true);
    await expect(page.locator('.brand-lockup')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Use single editor' })).toBeHidden();
    await page.screenshot({ path: `test-results/android-workspace-${width}.png` });
    await page.getByRole('button', { name: 'Search left editor', exact: true }).click();
    await page.getByRole('textbox', { name: 'Find in text' }).fill('text');
    await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
    for (const name of ['Previous match', 'Next match', 'Close search']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: `test-results/android-search-${width}.png` });
    await page.getByRole('button', { name: 'Close search' }).click();
  }
  const oldHeight = (await editor.boundingBox())!.height;
  await expect(page.locator('#symbols-left')).toBeHidden();
  await page.getByRole('button', { name: 'Symbols left editor' }).click();
  await expect(page.locator('#symbols-left')).toBeVisible();
  expect((await editor.boundingBox())!.height).toBe(oldHeight);
  await page.getByRole('button', { name: 'Symbols left editor' }).click();
  await expect(page.locator('#symbols-left')).toBeHidden();
  await expect(editor).toHaveValue('Some **text**, with symbols.\nSecond line.');
  await page.getByRole('button', { name: 'Editor 2', exact: true }).click();
  await page.getByRole('textbox', { name: 'right editor', exact: true }).fill('Other **text**');
  await expect(page.locator('#symbols-right')).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Editor 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Symbols left editor' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#symbols-left')).toBeHidden();
  await page.setViewportSize({ width: 393, height: 500 });
  await expect(page.getByRole('button', { name: 'Symbols left editor' })).toHaveAttribute('aria-expanded', 'false');
  await page.screenshot({ path: 'test-results/android-short-viewport.png' });
});

test('Settings returns through preset levels and restores a draft after restart', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.goto('/');
  const open = async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Presets Manage presets', exact: true }).click();
  };
  await open();
  await page.getByRole('button', { name: 'New preset', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('My unfinished preset');
  await page.getByRole('button', { name: /Add replacement/ }).click();
  await page.getByLabel('Find text 1').fill('old');
  await page.getByRole('button', { name: 'Back to preset list', exact: true }).click();
  await page.getByRole('button', { name: 'Back to Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  await page.reload();
  await open();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('My unfinished preset');
  await expect(page.getByLabel('Find text 1')).toHaveValue('old');
  await page.screenshot({ path: 'test-results/android-preset-draft.png' });
  await page.evaluate(() => window.dispatchEvent(new Event('android-back-request', { cancelable: true })));
  await expect(page.getByRole('button', { name: 'Back to Settings', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('android-back-request', { cancelable: true })));
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
});
