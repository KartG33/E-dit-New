import { expect, test } from './fixtures';

test('a mixed preset runs as one undo step and can be duplicated', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'left editor', exact: true });
  await expect(editor).toBeEnabled();
  await editor.fill('draft:[Припев]   hello');
  await page.getByRole('button', { name: 'Manage presets' }).click();
  await page.getByRole('button', { name: 'New preset', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Prepare song');
  await page.getByRole('button', { name: /Add replacement/ }).click();
  await page.getByLabel('Find text 1', { exact: true }).fill('[Припев]');
  await page.getByLabel('Replace with 1', { exact: true }).fill('[Chorus]');
  await page.getByRole('button', { name: /Add removal/ }).click();
  await page.getByLabel('Step 2 fragment 1').fill('draft:');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate preset' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Prepare song copy');
  await page.getByRole('button', { name: 'Close presets' }).click();
  await page.getByRole('button', { name: 'Presets', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare song', exact: true }).click();
  await expect(editor).toHaveValue('[Chorus] hello');
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click();
  await expect(editor).toHaveValue('draft:[Припев]   hello');
  await page.getByRole('button', { name: 'Redo', exact: true }).first().click();
  await expect(editor).toHaveValue('[Chorus] hello');
});
