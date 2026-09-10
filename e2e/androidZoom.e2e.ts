import { test, expect } from './fixtures';

test.use({ isMobile: true, hasTouch: true, viewport: { width: 393, height: 844 } });

test('Android page ignores pinch zoom while editor scrolling and selection work', async ({ page, context }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  const text = Array.from({ length: 80 }, (_, index) => `Line ${index}: editable text`).join('\n');
  await editor.fill(text);
  await editor.evaluate((el: HTMLTextAreaElement) => { el.blur(); el.scrollTop = 0; });
  const session = await context.newCDPSession(page);
  const pinch = async () => {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 175, y: 400 }, { id: 2, x: 215, y: 400 }] });
    for (let distance = 10; distance <= 120; distance += 10) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: 175 - distance, y: 400 }, { id: 2, x: 215 + distance, y: 400 }] });
      await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await pinch();
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] });
  for (let y = 580; y >= 360; y -= 20) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => editor.evaluate((el: HTMLTextAreaElement) => el.scrollTop)).toBeGreaterThan(0);
  await editor.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(0, 4); });
  await page.keyboard.insertText('Edited');
  await expect(editor).toHaveValue('Edited' + text.slice(4));

  // Positive control: prove the same gesture can actually zoom this browser.
  await page.evaluate(() => {
    document.querySelector('meta[name="viewport"]')!.setAttribute('content', 'width=device-width, initial-scale=1');
    document.documentElement.style.touchAction = 'auto';
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await pinch();
  await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBeGreaterThan(1);
});
