import { expect, test } from './fixtures';

test('dialogs restore selection, trap focus, and last tab survives a restart', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  await editor.fill('Start middle end');
  await editor.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(6, 12));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('button', { name: /Data/ }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
  await expect(editor).toBeFocused();
  expect(await editor.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([6, 12]);
  await page.getByRole('button', { name: 'Suno', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Suno', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Use single editor' }).click();
  await page.getByRole('button', { name: 'Tags', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Suno Tags' })).toBeVisible();
});

test('opening a tool in the other editor returns to that editor and keeps search focused', async ({ page }) => {
  await page.goto('/');
  const left = page.getByRole('textbox', { name: 'left editor', exact: true });
  const right = page.getByRole('textbox', { name: 'right editor', exact: true });
  await expect(right).toBeEnabled();
  await right.fill('Right selected text');
  await right.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(6, 14));
  await left.focus();
  await page.getByRole('button', { name: 'Find and edit right editor', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(right).toBeFocused();
  expect(await right.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([6, 14]);
  await left.focus();
  await page.getByRole('button', { name: 'Search right editor', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Find in text' })).toBeFocused();
});
