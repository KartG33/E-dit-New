import { test, expect } from './fixtures';

test('platform navigation stays the same on narrow and wide screens', async ({ page }, info) => {
  const android = info.project.name === 'android';
  await page.goto('/');
  const left = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(left).toBeEnabled();
  await left.fill('Persistent **text**');
  for (const width of [393, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('html')).toHaveAttribute('data-platform', info.project.name);
    if (android) {
      await expect(page.locator('.brand-lockup')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Use single editor' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Manage presets', exact: true })).toHaveCount(0);
      await expect(page.getByRole('textbox', { name: 'right editor', exact: true })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Symbols left editor' })).toBeVisible();
      await left.press('Control+\\');
      await expect(page.locator('.app-main')).toHaveClass(/is-single-mode/);
    } else {
      await expect(page.locator('.brand-lockup')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Use single editor' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Manage presets', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Symbols left editor' })).toHaveCount(0);
      await expect(page.getByRole('textbox', { name: 'right editor', exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const manage = page.getByRole('button', { name: 'Presets Manage presets', exact: true });
    if (android) await expect(manage).toBeVisible(); else await expect(manage).toHaveCount(0);
    await page.getByRole('button', { name: /Keys View/ }).click();
    const layout = page.getByRole('button', { name: 'Assign shortcut: One / two editors', exact: true });
    if (android) await expect(layout).toHaveCount(0); else await expect(layout).toBeVisible();
    await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
    await expect(left).toHaveValue('Persistent **text**');
    if (!android) {
      const pane = await page.locator('.app-editor-pane').first().boundingBox();
      for (const control of await page.locator('.app-editor-pane').first().locator('.editor-header-controls button').all()) {
        const box = (await control.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(pane!.x);
        expect(box.x + box.width).toBeLessThanOrEqual(pane!.x + pane!.width);
      }
    }
    await page.screenshot({ path: `test-results/separation-${info.project.name}-${width}.png` });
  }
  if (!android) {
    await page.getByRole('button', { name: 'Use single editor' }).click();
    await page.setViewportSize({ width: 393, height: 844 });
    await expect(page.getByRole('textbox', { name: 'right editor', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Editor 2', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'right editor', exact: true })).toBeVisible();
    await expect(left).toBeHidden();
  }
});

test('separate preview origins retain their own data after reload', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'This scenario opens both previews once.');
  await page.goto('/');
  const desktop = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(desktop).toBeEnabled();
  await desktop.fill('Desktop document');
  const phone = await context.newPage();
  await phone.goto('http://127.0.0.1:4174/');
  const android = phone.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(android).toBeEnabled();
  await expect(android).toHaveValue('');
  await android.fill('Android document');
  await page.reload(); await phone.reload();
  await expect(desktop).toHaveValue('Desktop document');
  await expect(android).toHaveValue('Android document');
  await phone.close();
});
