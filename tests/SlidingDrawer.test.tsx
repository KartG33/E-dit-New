import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        applyHistory={vi.fn()}
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
        applyHistory={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('persists notes across tab switching and saves to DB', async () => {
    await db.setSetting('drawerNoteText', 'Saved Note Content');
    const onTabChange = vi.fn();

    const { rerender } = render(
      <SlidingDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={onTabChange}
        applyHistory={vi.fn()}
      />
    );

    // Wait for setting load
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const textarea = screen.getByTestId('drawer-notes-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Saved Note Content');

    // Type new text
    await userEvent.type(textarea, ' (updated)');

    // Verify DB update
    const updatedSetting = await db.getSetting('drawerNoteText');
    expect(updatedSetting).toBe('Saved Note Content (updated)');

    // Switch tab to history
    rerender(
      <SlidingDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="history"
        onTabChange={onTabChange}
        applyHistory={vi.fn()}
      />
    );

    // Switch back to notes tab
    rerender(
      <SlidingDrawer
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={onTabChange}
        applyHistory={vi.fn()}
      />
    );

    const reloadedTextarea = screen.getByTestId('drawer-notes-textarea') as HTMLTextAreaElement;
    expect(reloadedTextarea.value).toBe('Saved Note Content (updated)');
  });
});
