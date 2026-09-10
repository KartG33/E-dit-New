import { capacitorDataFileAdapter } from './capacitorDataFileAdapter';

export const defaultDataFileAdapter = __APP_PREVIEW__
  ? (await import('./dataFileAdapter')).browserDataFileAdapter
  : capacitorDataFileAdapter;
