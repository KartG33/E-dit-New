import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { waitForEditorWrites } from '../src/lib/editorPersistence';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(async () => {
  cleanup();
  await waitForEditorWrites();
  localStorage.clear();
});
