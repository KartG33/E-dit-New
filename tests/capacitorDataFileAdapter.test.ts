import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CapacitorDataFileAdapter } from '../src/lib/platform/capacitorDataFileAdapter';
import type { DataFileAdapter, SelectedDataFile } from '../src/lib/platform/dataFileAdapter';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    canShare: vi.fn(),
    share: vi.fn(),
  },
}));

const selectedFile: SelectedDataFile = {
  name: 'data.json',
  handle: new Blob(['{"version":2}']),
};

const createImportAdapter = (): DataFileAdapter => ({
  selectFile: vi.fn().mockResolvedValue(selectedFile),
  readFile: vi.fn().mockResolvedValue('{"version":2}'),
  saveFile: vi.fn().mockResolvedValue('saved'),
});

describe('CapacitorDataFileAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/edit-data.json' });
    vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined);
    vi.mocked(Share.canShare).mockResolvedValue({ value: true });
    vi.mocked(Share.share).mockResolvedValue({ activityType: '' });
  });

  it('uses the system-backed browser picker for Android import', async () => {
    const importAdapter = createImportAdapter();
    const adapter = new CapacitorDataFileAdapter(importAdapter);

    const file = await adapter.selectFile({ accept: ['application/json', '.json'] });

    expect(file).toBe(selectedFile);
    expect(importAdapter.selectFile).toHaveBeenCalledWith({
      accept: ['application/json', '.json'],
    });
    await expect(adapter.readFile(selectedFile)).resolves.toBe('{"version":2}');
    expect(importAdapter.readFile).toHaveBeenCalledWith(selectedFile);
  });

  it('writes Data to cache, opens native sharing, and removes the temporary file', async () => {
    const adapter = new CapacitorDataFileAdapter();

    await expect(adapter.saveFile({
      fileName: 'edit-data.json',
      contents: '{"version":2}',
      mediaType: 'application/json',
    })).resolves.toBe('saved');

    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path: 'edit-data.json',
      data: '{"version":2}',
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    expect(Share.share).toHaveBeenCalledWith({
      title: 'E-dit Data export',
      text: 'E-dit Data v2 backup',
      files: ['file:///cache/edit-data.json'],
      dialogTitle: 'Save or share E-dit Data',
    });
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: 'edit-data.json',
      directory: Directory.Cache,
    });
  });

  it('removes the temporary file when native sharing fails', async () => {
    vi.mocked(Share.share).mockRejectedValue(new Error('Share failed'));
    const adapter = new CapacitorDataFileAdapter();

    await expect(adapter.saveFile({
      fileName: 'edit-data.json',
      contents: '{}',
      mediaType: 'application/json',
    })).rejects.toThrow('Share failed');

    expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
  });

  it('rejects unavailable native sharing and still removes the temporary file', async () => {
    vi.mocked(Share.canShare).mockResolvedValue({ value: false });
    const adapter = new CapacitorDataFileAdapter();

    await expect(adapter.saveFile({
      fileName: 'edit-data.json',
      contents: '{}',
      mediaType: 'application/json',
    })).rejects.toThrow('Android file sharing is unavailable');

    expect(Share.share).not.toHaveBeenCalled();
    expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
  });
});
