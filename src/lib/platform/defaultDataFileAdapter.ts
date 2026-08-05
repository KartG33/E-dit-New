import { isTauri } from '@tauri-apps/api/core';
import { browserDataFileAdapter, type DataFileAdapter } from './dataFileAdapter';
import { tauriDataFileAdapter } from './tauriDataFileAdapter';

export const defaultDataFileAdapter: DataFileAdapter = isTauri()
  ? tauriDataFileAdapter
  : browserDataFileAdapter;
