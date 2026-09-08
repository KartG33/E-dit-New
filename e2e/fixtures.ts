import { test as base, expect } from '@playwright/test';
export { expect };
export const test = base.extend<{ consoleCheck: void }>({
  consoleCheck: [async ({ context }, use) => {
    const errors: string[] = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    });
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});
