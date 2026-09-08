import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { SlidingDrawer } from '../src/components/Drawer/SlidingDrawer';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';

describe('SlidingDrawer Component', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.history.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('closes when Esc key is pressed', () => {
    const onClose = vi.fn();
    render(
      <SlidingDrawer
        isOpen={true}
        onClose={onClose}
        applyHistoryVersion={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClose on Esc if drawer is closed', () => {
    const onClose = vi.fn();
    render(
      <SlidingDrawer
        isOpen={false}
        onClose={onClose}
        applyHistoryVersion={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('contains only History content', () => {
    render(
      <SlidingDrawer
        isOpen={true}
        onClose={vi.fn()}
        applyHistoryVersion={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'History' })).toBeDefined();
    expect(screen.getByText('История изменений')).toBeDefined();
    expect(screen.queryByText('Data')).toBeNull();
  });

  it('restores a saved version and closes the drawer', async () => {
    await db.history.add({
      editorId: 'left',
      text: 'Restored mobile text',
      timestamp: Date.now(),
    });
    const applyHistoryVersion = vi.fn();
    const onClose = vi.fn();

    render(
      <SlidingDrawer
        isOpen={true}
        onClose={onClose}
        applyHistoryVersion={applyHistoryVersion}
      />
    );

    const version = await screen.findByText('Restored mobile text');
    fireEvent.click(version);

    expect(applyHistoryVersion).toHaveBeenCalledWith('Restored mobile text');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the closed drawer out of keyboard navigation', () => {
    render(
      <SlidingDrawer
        isOpen={false}
        onClose={vi.fn()}
        applyHistoryVersion={vi.fn()}
      />
    );

    expect(screen.getByTestId('sliding-drawer').hasAttribute('inert')).toBe(true);
  });

  it('searches full text beyond the first 50 records, filters and updates the open list', async () => {
    const oldText = `${'Hidden preview '.repeat(50)}needle at the end`;
    await db.history.bulkAdd([
      { editorId: 'left', text: oldText, timestamp: 1 },
      ...Array.from({ length: 50 }, (_, index) => ({ editorId: 'right' as const, text: `Recent ${index}`, timestamp: index + 2 })),
    ]);
    const apply = vi.fn(); const close = vi.fn();
    render(<SlidingDrawer isOpen onClose={close} applyHistoryVersion={apply} />);
    await screen.findByText('51 versions');
    fireEvent.change(screen.getByLabelText('Search history'), { target: { value: 'NEEDLE' } });
    expect(screen.getByText('1 versions')).toBeDefined();
    fireEvent.change(screen.getByLabelText('History editor filter'), { target: { value: 'right' } });
    expect(screen.getByText('No matching versions.')).toBeDefined();
    await db.history.add({ editorId: 'right', text: 'New needle', timestamp: 100 });
    await screen.findByText('New needle');
    fireEvent.change(screen.getByLabelText('History editor filter'), { target: { value: 'left' } });
    await waitFor(() => expect(screen.queryByText('New needle')).toBeNull());
    fireEvent.click(screen.getByText(oldText));
    expect(apply).toHaveBeenCalledWith(oldText);
    expect(close).toHaveBeenCalledOnce();
  });
});
