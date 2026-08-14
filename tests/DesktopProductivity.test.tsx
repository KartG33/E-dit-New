import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { db } from '../src/lib/db';

describe.sequential('Desktop productivity', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.history, db.presets, db.settings, async () => {
      await db.history.clear();
      await db.presets.clear();
      await db.settings.clear();
      await db.settings.bulkPut([
        { key: 'dualMode', value: true },
        { key: 'activeEditor', value: 'left' },
        { key: 'editorLeftText', value: 'hello   world' },
        { key: 'editorRightText', value: 'second editor' },
      ]);
      await db.presets.add({
        name: 'Clean spacing',
        data: { type: 'chain', commands: ['text.spaces'] },
        shortcut: { code: 'KeyK', ctrl: true, shift: true, alt: false, meta: false },
        isFavorite: false,
        createdAt: 1,
        updatedAt: 1,
        order: 0,
      });
    });
  });

  it('toggles one editor, switches editors without unmounting, and persists the mode', async () => {
    render(<App />);
    const leftEditor = screen.getByRole('textbox', { name: 'left editor' });
    const rightEditor = screen.getByRole('textbox', { name: 'right editor' });
    await waitFor(() => expect((leftEditor as HTMLTextAreaElement).value).toBe('hello   world'));

    fireEvent.click(screen.getByRole('button', { name: 'Use single editor' }));
    const main = leftEditor.closest('.app-main')!;
    expect(main.classList.contains('is-single-mode')).toBe(true);
    expect(rightEditor.closest('.app-editor-pane')?.classList.contains('is-single-hidden')).toBe(true);

    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    expect(leftEditor.closest('.app-editor-pane')?.classList.contains('is-single-hidden')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'right editor' })).toBe(rightEditor);
    await expect(db.getSetting('activeEditor')).resolves.toBe('right');
    await expect(db.getSetting('dualMode')).resolves.toBe(false);

    fireEvent.keyDown(window, { key: '\\', code: 'Backslash', ctrlKey: true });
    expect(main.classList.contains('is-dual-mode')).toBe(true);
  });

  it('restores the previously active editor without the initial focus overwriting it', async () => {
    await db.setSetting('activeEditor', 'right');
    render(<App />);
    const rightEditor = screen.getByRole('textbox', { name: 'right editor' });
    await waitFor(() => expect(rightEditor.closest('.editor-card')?.classList.contains('is-active')).toBe(true));
    await expect(db.getSetting('activeEditor')).resolves.toBe('right');
  });

  it('runs a preset shortcut on the active editor as one undoable edit', async () => {
    render(<App />);
    const leftEditor = screen.getByRole('textbox', { name: 'left editor' }) as HTMLTextAreaElement;
    await waitFor(() => expect(leftEditor.value).toBe('hello   world'));
    fireEvent.click(screen.getByRole('button', { name: 'Presets' }));
    await screen.findByRole('button', { name: /Clean spacing/ });

    fireEvent.keyDown(leftEditor, { key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true });
    expect(leftEditor.value).toBe('hello world');
    fireEvent.click(screen.getAllByRole('button', { name: 'Undo' })[0]);
    expect(leftEditor.value).toBe('hello   world');
  });
});
