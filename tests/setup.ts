import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
