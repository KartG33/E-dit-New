import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataPanel } from '../src/components/Data/DataPanel';
import { db } from '../src/lib/db';
import {
  BrowserDataFileAdapter,
  type DataFileAdapter,
  type SelectedDataFile,
} from '../src/lib/platform/dataFileAdapter';

const selectedFile: SelectedDataFile = { name: 'data.json', handle: {} };

const createMockAdapter = (): DataFileAdapter => ({
  selectFile: vi.fn().mockResolvedValue(selectedFile),
  readFile: vi.fn(),
  saveFile: vi.fn().mockResolvedValue('saved'),
});

describe('DataPanel file adapter boundary', () => {
  beforeEach(async () => {
    await db.presets.clear();
    await db.settings.clear();
  });

  it('exports the unchanged Data v2 payload through the adapter', async () => {
    await db.settings.add({ key: 'theme', value: 'dark' });
    const adapter = createMockAdapter();
    render(<DataPanel fileAdapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(adapter.saveFile).toHaveBeenCalledOnce());
    const request = vi.mocked(adapter.saveFile).mock.calls[0][0];
    const payload = JSON.parse(request.contents);
    expect(request.mediaType).toBe('application/json');
    expect(request.fileName).toMatch(/^edit-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(payload).toMatchObject({
      version: 2,
      presets: [],
      settings: [{ key: 'theme', value: 'dark' }],
    });
    expect(typeof payload.timestamp).toBe('number');
  });

  it('selects and reads through the adapter before safe import rejects invalid data', async () => {
    await db.settings.add({ key: 'theme', value: 'light' });
    const adapter = createMockAdapter();
    vi.mocked(adapter.readFile).mockResolvedValue(JSON.stringify({
      version: 3,
      presets: [],
      settings: [],
      timestamp: 1,
    }));
    render(<DataPanel fileAdapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText('Import failed: Unsupported Data version: 3')).toBeDefined();
    expect(adapter.selectFile).toHaveBeenCalledWith({ accept: ['application/json', '.json'] });
    expect(adapter.readFile).toHaveBeenCalledWith(selectedFile);
    await expect(db.settings.toArray()).resolves.toEqual([{ key: 'theme', value: 'light' }]);
  });

  it('does nothing when platform file selection is cancelled', async () => {
    const adapter = createMockAdapter();
    vi.mocked(adapter.selectFile).mockResolvedValue(null);
    render(<DataPanel fileAdapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(adapter.selectFile).toHaveBeenCalledOnce());
    expect(adapter.readFile).not.toHaveBeenCalled();
  });

  it('does not report success when desktop save is cancelled', async () => {
    const adapter = createMockAdapter();
    vi.mocked(adapter.saveFile).mockResolvedValue('cancelled');
    render(<DataPanel fileAdapter={adapter} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(adapter.saveFile).toHaveBeenCalledOnce());
    expect(screen.queryByText('Export successful')).toBeNull();
  });
});

describe('BrowserDataFileAdapter', () => {
  it('reads browser File contents', async () => {
    const adapter = new BrowserDataFileAdapter();
    const file = new File(['browser contents'], 'data.json', { type: 'application/json' });

    await expect(adapter.readFile({ name: file.name, handle: file })).resolves.toBe('browser contents');
  });

  it('saves through a temporary browser download link', async () => {
    const adapter = new BrowserDataFileAdapter();
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await expect(adapter.saveFile({
      fileName: 'data.json',
      contents: '{}',
      mediaType: 'application/json',
    })).resolves.toBe('saved');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  });
});
