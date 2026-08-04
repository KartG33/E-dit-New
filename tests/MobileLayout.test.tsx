import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { db } from '../src/lib/db';

describe('Mobile editor layout state', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.history, db.settings, async () => {
      await db.history.clear();
      await db.settings.clear();
    });
  });

  it('switches the visible editor pane without unmounting either editor', async () => {
    render(<App />);

    const leftEditor = screen.getByRole('textbox', { name: 'left editor' });
    const rightEditor = screen.getByRole('textbox', { name: 'right editor' });
    await waitFor(() => expect((leftEditor as HTMLTextAreaElement).disabled).toBe(false));

    const leftPane = leftEditor.closest('.app-editor-pane');
    const rightPane = rightEditor.closest('.app-editor-pane');
    expect(leftPane?.classList.contains('is-mobile-visible')).toBe(true);
    expect(rightPane?.classList.contains('is-mobile-visible')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Editor 2' }));
    expect(leftPane?.classList.contains('is-mobile-visible')).toBe(false);
    expect(rightPane?.classList.contains('is-mobile-visible')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'left editor' })).toBe(leftEditor);
    expect(screen.getByRole('textbox', { name: 'right editor' })).toBe(rightEditor);
  });

  it('keeps the Tags panel visible for the active mobile editor', async () => {
    render(<App />);
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: 'left editor' }) as HTMLTextAreaElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    const tagsPanel = screen.getByRole('dialog', { name: 'Suno Tags' });
    expect(tagsPanel.closest('.app-editor-pane')?.classList.contains('is-mobile-visible')).toBe(true);
  });
});
