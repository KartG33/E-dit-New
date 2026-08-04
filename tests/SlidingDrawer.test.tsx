import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
        activeTab="history"
        onTabChange={vi.fn()}
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
        activeTab="history"
        onTabChange={vi.fn()}
        applyHistoryVersion={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders History and Data tabs without Notes section', () => {
    const onTabChange = vi.fn();
    render(
      <SlidingDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="history"
        onTabChange={onTabChange}
        applyHistoryVersion={vi.fn()}
      />
    );

    expect(screen.getByText('History')).toBeDefined();
    expect(screen.getByText('Data')).toBeDefined();
    expect(screen.queryByText('Заметки')).toBeNull();

    const dataTab = screen.getByText('Data');
    fireEvent.click(dataTab);
    expect(onTabChange).toHaveBeenCalledWith('data');
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
        activeTab="history"
        onTabChange={vi.fn()}
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
        activeTab="history"
        onTabChange={vi.fn()}
        applyHistoryVersion={vi.fn()}
      />
    );

    expect(screen.getByTestId('sliding-drawer').hasAttribute('inert')).toBe(true);
  });
});
