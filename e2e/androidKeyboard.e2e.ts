import { test, expect } from './fixtures';

test('keyboard occlusion leaves editor fixed, scrolls caret and positions symbols', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  const content = Array.from({ length: 80 }, (_, i) => `Line ${i} **text**`).join('\n');
  await editor.fill(content);
  await editor.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  const card = editor.locator('..').locator('..');
  const original = await card.boundingBox();
  const originalInput = await editor.boundingBox();
  const toggle = page.getByRole('button', { name: 'Symbols left editor' });
  await expect(toggle).toHaveText('S');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const occlude = async (height: number) => {
    await page.evaluate(height => {
      Object.assign(window, { __editKeyboardInsets: { height, visible: height > 0 } });
      window.dispatchEvent(new Event('edit-keyboard-insets'));
    }, height);
  };
  const initialScroll = await editor.evaluate(el => el.scrollTop);
  await occlude(320);
  await expect.poll(() => editor.evaluate(el => el.scrollTop)).toBeGreaterThan(initialScroll);
  expect(await card.boundingBox()).toEqual(original);
  expect(await editor.boundingBox()).toEqual(originalInput);
  await expect(editor).toHaveValue(content);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const tray = page.locator('#symbols-left');
  await expect(tray).toBeVisible();
  await expect.poll(async () => { const b = (await tray.boundingBox())!; return Math.round(b.y + b.height); }).toBe(524);
  expect(await editor.boundingBox()).toEqual(originalInput);
  // Last line can be brought above both the keyboard and tray without moving the page.
  const geometry = await editor.evaluate((el: HTMLTextAreaElement) => ({
    scroll: el.scrollTop, height: el.scrollHeight, viewport: el.clientHeight,
    padding: parseFloat(getComputedStyle(el).paddingBottom), pageScroll: window.scrollY,
  }));
  expect(geometry.scroll).toBeGreaterThan(initialScroll);
  expect(geometry.padding).toBeGreaterThan(320);
  expect(geometry.pageScroll).toBe(0);
  await occlude(0);
  await expect.poll(async () => { const b = (await tray.boundingBox())!; return Math.round(b.y + b.height); })
    .toBe(Math.round(original!.y + original!.height - 1));
  expect(await card.boundingBox()).toEqual(original);
  await toggle.click();
  await expect(tray).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
