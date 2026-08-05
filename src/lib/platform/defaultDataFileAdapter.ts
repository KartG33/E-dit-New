import { Capacitor } from '@capacitor/core';
import { isTauri } from '@tauri-apps/api/core';
import { capacitorDataFileAdapter } from './capacitorDataFileAdapter';
import { browserDataFileAdapter, type DataFileAdapter } from './dataFileAdapter';
import { tauriDataFileAdapter } from './tauriDataFileAdapter';

export const selectDataFileAdapterForPlatform = (
  tauri: boolean,
  native: boolean,
): DataFileAdapter => {
  if (tauri) return tauriDataFileAdapter;
  if (native) return capacitorDataFileAdapter;
  return browserDataFileAdapter;
};

export const defaultDataFileAdapter = selectDataFileAdapterForPlatform(
  isTauri(),
  Capacitor.isNativePlatform(),
);
