import { tauriDataFileAdapter } from './tauriDataFileAdapter';

export const defaultDataFileAdapter = __APP_PREVIEW__
  ? (await import('./dataFileAdapter')).browserDataFileAdapter
  : tauriDataFileAdapter;
