import { test as base, expect, type Page } from '@playwright/test';
export { expect };
export const test = base.extend<{ consoleCheck: (page: Page) => void }>({
  consoleCheck: [async ({ context }, use) => {
    const errors: string[] = [];
    const checkPage = (page: Page) => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    };
    context.on('page', checkPage);
    await use(checkPage);
    expect(errors).toEqual([]);
  }, { auto: true }],
});
