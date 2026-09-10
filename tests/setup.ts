import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { waitForEditorWrites } from '../apps/desktop/src/lib/editorPersistence';

import { waitForEditorWrites as waitForAndroidWrites } from '../apps/android/src/lib/editorPersistence';

vi.stubGlobal('__APP_PREVIEW__', true);

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(async () => {
  cleanup();
  await Promise.all([waitForEditorWrites(), waitForAndroidWrites()]);
  localStorage.clear();
});
