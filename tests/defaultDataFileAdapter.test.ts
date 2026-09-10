import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.stubGlobal('__APP_PREVIEW__', true); vi.resetModules(); });

describe('independent application file adapters', () => {
  it('uses only Tauri for a production Desktop build', async () => {
    vi.stubGlobal('__APP_PREVIEW__', false);
    const { defaultDataFileAdapter } = await import('../apps/desktop/src/lib/platform/defaultDataFileAdapter');
    const { tauriDataFileAdapter } = await import('../apps/desktop/src/lib/platform/tauriDataFileAdapter');
    expect(defaultDataFileAdapter).toBe(tauriDataFileAdapter);
  });
  it('uses only Capacitor for a production Android build', async () => {
    vi.stubGlobal('__APP_PREVIEW__', false);
    const { defaultDataFileAdapter } = await import('../apps/android/src/lib/platform/defaultDataFileAdapter');
    const { capacitorDataFileAdapter } = await import('../apps/android/src/lib/platform/capacitorDataFileAdapter');
    expect(defaultDataFileAdapter).toBe(capacitorDataFileAdapter);
  });
  it('uses the browser adapter only in an explicit Desktop preview', async () => {
    vi.stubGlobal('__APP_PREVIEW__', true);
    const { defaultDataFileAdapter } = await import('../apps/desktop/src/lib/platform/defaultDataFileAdapter');
    const { browserDataFileAdapter } = await import('../apps/desktop/src/lib/platform/dataFileAdapter');
    expect(defaultDataFileAdapter).toBe(browserDataFileAdapter);
  });
  it('uses the browser adapter only in an explicit Android preview', async () => {
    vi.stubGlobal('__APP_PREVIEW__', true);
    const { defaultDataFileAdapter } = await import('../apps/android/src/lib/platform/defaultDataFileAdapter');
    const { browserDataFileAdapter } = await import('../apps/android/src/lib/platform/dataFileAdapter');
    expect(defaultDataFileAdapter).toBe(browserDataFileAdapter);
  });
});
