import { beforeEach, describe, expect, it, vi } from 'vitest';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { TauriDataFileAdapter } from '../src/lib/platform/tauriDataFileAdapter';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

describe('TauriDataFileAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects and reads a JSON file through Tauri', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Users\\User\\data.json');
    vi.mocked(readTextFile).mockResolvedValue('{"version":2}');
    const adapter = new TauriDataFileAdapter();

    const file = await adapter.selectFile({ accept: ['application/json', '.json'] });

    expect(file).toEqual({
      name: 'data.json',
      handle: 'C:\\Users\\User\\data.json',
    });
    await expect(adapter.readFile(file!)).resolves.toBe('{"version":2}');
    expect(readTextFile).toHaveBeenCalledWith('C:\\Users\\User\\data.json');
  });

  it('returns null when file selection is cancelled', async () => {
    vi.mocked(open).mockResolvedValue(null);
    const adapter = new TauriDataFileAdapter();

    await expect(adapter.selectFile({ accept: ['.json'] })).resolves.toBeNull();
  });

  it('writes to the path selected in the save dialog', async () => {
    vi.mocked(save).mockResolvedValue('D:\\Backups\\edit-data.json');
    const adapter = new TauriDataFileAdapter();

    await expect(adapter.saveFile({
      fileName: 'edit-data.json',
      contents: '{}',
      mediaType: 'application/json',
    })).resolves.toBe('saved');

    expect(writeTextFile).toHaveBeenCalledWith('D:\\Backups\\edit-data.json', '{}');
  });

  it('does not write when the save dialog is cancelled', async () => {
    vi.mocked(save).mockResolvedValue(null);
    const adapter = new TauriDataFileAdapter();

    await expect(adapter.saveFile({
      fileName: 'edit-data.json',
      contents: '{}',
      mediaType: 'application/json',
    })).resolves.toBe('cancelled');
    expect(writeTextFile).not.toHaveBeenCalled();
  });
});
