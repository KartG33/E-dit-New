import { expect, test } from '@playwright/test';

test('desktop productivity flow and unchanged mobile layout', async ({ browser }) => {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto('/');
  const leftEditor = desktop.getByRole('textbox', { name: 'left editor' });
  await expect(leftEditor).toBeEnabled();

  await desktop.getByRole('button', { name: 'Use single editor' }).click();
  await expect(desktop.locator('.app-main')).toHaveClass(/is-single-mode/);
  await expect(desktop.getByRole('button', { name: 'Editor 1' })).toBeVisible();
  await expect(desktop.getByRole('textbox', { name: 'right editor' })).toBeHidden();

  await desktop.keyboard.press('Alt+2');
  await expect(desktop.getByRole('textbox', { name: 'right editor' })).toBeVisible();
  await expect(desktop.getByRole('textbox', { name: 'left editor' })).toBeHidden();
  await desktop.keyboard.press('Control+\\');
  await expect(desktop.locator('.app-main')).toHaveClass(/is-dual-mode/);

  await desktop.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(desktop.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await desktop.screenshot({ path: 'test-results/phase6-shortcut-help.png', fullPage: true });
  await desktop.keyboard.press('Escape');
  await expect(desktop.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden();

  await desktop.getByRole('button', { name: 'Manage presets' }).click();
  await desktop.getByRole('button', { name: 'New preset' }).click();
  await desktop.getByLabel('Name').fill('Shortcut spacing');
  await desktop.getByRole('button', { name: 'Add', exact: true }).click();
  await desktop.getByRole('button', { name: 'Assign shortcut' }).click();
  await desktop.keyboard.press('Control+Shift+K');
  await expect(desktop.getByRole('button', { name: 'Ctrl + Shift + K' })).toBeVisible();
  await desktop.getByRole('button', { name: 'Save preset' }).click();
  await expect(desktop.getByText('Saved.')).toBeVisible();
  await desktop.screenshot({ path: 'test-results/phase6-preset-shortcut.png', fullPage: true });
  await desktop.getByRole('button', { name: 'Close presets' }).click();

  await leftEditor.fill('hello   world');
  await leftEditor.press('Control+Shift+K');
  await expect(leftEditor).toHaveValue('hello world');
  await desktop.screenshot({ path: 'test-results/phase6-desktop-1280x800.png', fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 393, height: 873 }, isMobile: true });
  await mobile.goto('/');
  await expect(mobile.getByRole('textbox', { name: 'left editor' })).toBeEnabled();
  await expect(mobile.getByRole('button', { name: 'Keyboard shortcuts' })).toBeHidden();
  await expect(mobile.locator('.app-editor-pane.is-mobile-visible')).toHaveCount(1);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mobile.screenshot({ path: 'test-results/phase6-mobile-393x873.png', fullPage: true });

  await desktop.close();
  await mobile.close();
});
