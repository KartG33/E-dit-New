import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('reload, immediate export and import preserve the latest intended text', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  await editor.fill('Last line before immediate reload');
  await page.reload();
  await expect(editor).toHaveValue('Last line before immediate reload');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await editor.fill('Last line before export');
  await page.getByRole('button', { name: 'Settings', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Data Import or export application data' }).click({ force: true });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click({ force: true });
  const file = await downloading;
  const data = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(data.settings).toContainEqual({ key: 'editorLeftText', value: 'Last line before export' });
  await page.getByRole('button', { name: 'Close Settings' }).click({ force: true });
  await editor.fill('Old pending value');
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'Settings', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Data Import or export application data' }).click({ force: true });
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click({ force: true });
  await (await choosing).setFiles({ name: 'old-data.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    version: 2, timestamp: 1, presets: [], settings: [{ key: 'editorLeftText', value: 'Imported value' }],
  })) });
  await expect(page.getByText('Import successful', { exact: true })).toBeVisible();
  await page.clock.runFor(2200);
  await expect(editor).toHaveValue('Imported value');
  await page.reload();
  await expect(editor).toHaveValue('Imported value');
});
