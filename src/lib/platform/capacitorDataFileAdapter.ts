import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  browserDataFileAdapter,
  type DataFileAdapter,
  type SaveDataFileOptions,
  type SelectDataFileOptions,
  type SelectedDataFile,
} from './dataFileAdapter';

type ImportDataFileAdapter = Pick<DataFileAdapter, 'selectFile' | 'readFile'>;

export class CapacitorDataFileAdapter implements DataFileAdapter {
  private readonly importAdapter: ImportDataFileAdapter;

  constructor(importAdapter: ImportDataFileAdapter = browserDataFileAdapter) {
    this.importAdapter = importAdapter;
  }

  selectFile(options: SelectDataFileOptions): Promise<SelectedDataFile | null> {
    return this.importAdapter.selectFile(options);
  }

  readFile(file: SelectedDataFile): Promise<string> {
    return this.importAdapter.readFile(file);
  }

  async saveFile(options: SaveDataFileOptions): Promise<'saved'> {
    const file = await Filesystem.writeFile({
      path: options.fileName,
      data: options.contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    try {
      const sharing = await Share.canShare();
      if (!sharing.value) {
        throw new Error('Android file sharing is unavailable');
      }

      await Share.share({
        title: 'E-dit Data export',
        text: 'E-dit Data v2 backup',
        files: [file.uri],
        dialogTitle: 'Save or share E-dit Data',
      });
      return 'saved';
    } finally {
      await Filesystem.deleteFile({
        path: options.fileName,
        directory: Directory.Cache,
      }).catch(() => undefined);
    }
  }
}

export const capacitorDataFileAdapter: DataFileAdapter = new CapacitorDataFileAdapter();
