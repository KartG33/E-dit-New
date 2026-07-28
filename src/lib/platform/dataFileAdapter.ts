export interface SelectedDataFile {
  readonly name: string;
  readonly handle: unknown;
}

export interface SelectDataFileOptions {
  accept: string[];
}

export interface SaveDataFileOptions {
  fileName: string;
  contents: string;
  mediaType: string;
}

export interface DataFileAdapter {
  selectFile(options: SelectDataFileOptions): Promise<SelectedDataFile | null>;
  readFile(file: SelectedDataFile): Promise<string>;
  saveFile(options: SaveDataFileOptions): Promise<void>;
}

export class BrowserDataFileAdapter implements DataFileAdapter {
  async selectFile(options: SelectDataFileOptions): Promise<SelectedDataFile | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept.join(',');

      const finish = (file: File | null) => {
        input.remove();
        resolve(file ? { name: file.name, handle: file } : null);
      };

      input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
      input.addEventListener('cancel', () => finish(null), { once: true });
      input.click();
    });
  }

  async readFile(file: SelectedDataFile): Promise<string> {
    if (!(file.handle instanceof Blob)) {
      throw new Error('Browser file handle is invalid');
    }
    return file.handle.text();
  }

  async saveFile(options: SaveDataFileOptions): Promise<void> {
    const blob = new Blob([options.contents], { type: options.mediaType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    try {
      anchor.href = url;
      anchor.download = options.fileName;
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  }
}

export const browserDataFileAdapter: DataFileAdapter = new BrowserDataFileAdapter();
