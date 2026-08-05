import { describe, expect, it } from 'vitest';
import { capacitorDataFileAdapter } from '../src/lib/platform/capacitorDataFileAdapter';
import { browserDataFileAdapter } from '../src/lib/platform/dataFileAdapter';
import {
  selectDataFileAdapterForPlatform,
} from '../src/lib/platform/defaultDataFileAdapter';
import { tauriDataFileAdapter } from '../src/lib/platform/tauriDataFileAdapter';

describe('selectDataFileAdapterForPlatform', () => {
  it('keeps the Tauri adapter for the Windows desktop shell', () => {
    expect(selectDataFileAdapterForPlatform(true, false)).toBe(tauriDataFileAdapter);
  });

  it('uses the Capacitor adapter on a native mobile platform', () => {
    expect(selectDataFileAdapterForPlatform(false, true)).toBe(capacitorDataFileAdapter);
  });

  it('keeps the browser adapter for the web version', () => {
    expect(selectDataFileAdapterForPlatform(false, false)).toBe(browserDataFileAdapter);
  });

  it('gives Tauri precedence if both platform signals are present', () => {
    expect(selectDataFileAdapterForPlatform(true, true)).toBe(tauriDataFileAdapter);
  });
});
