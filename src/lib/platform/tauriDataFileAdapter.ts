import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  DataFileAdapter,
  SaveDataFileOptions,
  SelectDataFileOptions,
  SelectedDataFile,
} from './dataFileAdapter';

const jsonFilter = [{ name: 'JSON', extensions: ['json'] }];

export class TauriDataFileAdapter implements DataFileAdapter {
  async selectFile(_options: SelectDataFileOptions): Promise<SelectedDataFile | null> {
    const path = await open({
      multiple: false,
      directory: false,
      filters: jsonFilter,
    });

    if (!path) return null;

    return {
      name: path.split(/[\\/]/).pop() ?? path,
      handle: path,
    };
  }

  async readFile(file: SelectedDataFile): Promise<string> {
    if (typeof file.handle !== 'string') {
      throw new Error('Desktop file handle is invalid');
    }
    return readTextFile(file.handle);
  }

  async saveFile(options: SaveDataFileOptions): Promise<'saved' | 'cancelled'> {
    const path = await save({
      defaultPath: options.fileName,
      filters: jsonFilter,
    });

    if (!path) return 'cancelled';

    await writeTextFile(path, options.contents);
    return 'saved';
  }
}

export const tauriDataFileAdapter: DataFileAdapter = new TauriDataFileAdapter();
