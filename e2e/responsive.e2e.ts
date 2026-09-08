import { test, expect } from './fixtures';

test('long text navigation and compact controls remain usable', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  await editor.fill('A long wrapped line of lyrics '.repeat(3300) + '\n[Chorus]');
  await page.getByRole('button', { name: 'Search left editor', exact: true }).click();
  const started = Date.now();
  await page.getByRole('textbox', { name: 'Find in text' }).fill('[Chorus]');
  await expect(page.getByText('1 of 1', { exact: true })).toBeVisible();
  expect(await editor.evaluate((el: HTMLTextAreaElement) => el.scrollTop > 0)).toBe(true);
  await expect(page.locator('.editor-highlight-layer mark')).toHaveText('[Chorus]');
  await editor.locator('..').locator('..').getByRole('button', { name: '[', exact: true }).waitFor();
  await expect.poll(async () => {
    const highlightBox = (await page.locator('.editor-highlight-layer mark').boundingBox())!;
    const editorBox = (await editor.boundingBox())!;
    return highlightBox.y >= editorBox.y && highlightBox.y + highlightBox.height <= editorBox.y + editorBox.height;
  }).toBe(true);
  expect(Date.now() - started).toBeLessThan(3000);
  await page.screenshot({ path: 'test-results/qa-desktop-search.png' });
  await page.getByRole('button', { name: 'Close search' }).click();
  for (const width of [360, 393, 412, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 393 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const name of ['Search left editor', 'Copy left text to other editor', 'Find and edit left editor']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = (await button.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    for (const button of await page.locator('.app-editor-pane.is-mobile-visible .editor-header-controls button').all()) {
      const box = await button.boundingBox();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(width - 8);
    }
    await page.screenshot({ path: `test-results/qa-mobile-${width}.png` });
  }
  await page.setViewportSize({ width: 393, height: 844 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Keys/ }).click();
  await expect(page.getByRole('button', { name: 'Assign shortcut: Switch to Editor 1' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/qa-mobile-keys.png' });
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.getByRole('button', { name: 'Manage presets' }).click();
  await page.getByRole('button', { name: 'New preset', exact: true }).click();
  await page.getByRole('button', { name: 'Add replacement', exact: false }).click();
  await page.screenshot({ path: 'test-results/qa-mobile-preset.png' });
});
