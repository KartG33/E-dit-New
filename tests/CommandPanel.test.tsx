import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPanel } from '../src/components/Commands/CommandPanel';
import { collapseSpaces } from '../src/lib/commands/text';
import { clean } from '../src/lib/commands/suno';
import { db } from '../src/lib/db';

describe('CommandPanel', () => {
  beforeEach(async () => {
    await db.presets.clear();
  });

  it('keeps Text commands as the default independent section', () => {
    const applyCommand = vi.fn();
    render(<CommandPanel applyCommand={applyCommand} insertTag={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Spaces' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Suno Clean' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Text' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Spaces' }));
    expect(applyCommand).toHaveBeenCalledWith(collapseSpaces);
  });

  it('shows tags in text order and supports inserting, editing, and deleting them', () => {
    const applyCommand = vi.fn();
    const insertTag = vi.fn();
    const editorText = '[Verse]\nFirst\n[Chorus]\n[Verse]';
    const { rerender } = render(
      <CommandPanel
        applyCommand={applyCommand}
        editorText={editorText}
        insertTag={insertTag}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));

    expect(screen.queryByRole('button', { name: 'Spaces' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Suno' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Tags' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Tag Builder')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    expect(screen.getByRole('dialog', { name: 'Suno Tags' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tags' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Tag Builder')).toBeDefined();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '[Verse]',
      '[Chorus]',
      '[Verse]',
    ]);

    fireEvent.change(screen.getByLabelText('Num:'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }));
    expect(insertTag).toHaveBeenCalledWith('Chorus 2');

    fireEvent.change(screen.getByLabelText('Num:'), { target: { value: 'wrong' } });
    expect((screen.getByRole('button', { name: 'Chorus' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Custom tag'), { target: { value: 'Whispered Vocal' } });
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(insertTag).toHaveBeenLastCalledWith('Whispered Vocal');
    fireEvent.change(screen.getByLabelText('Num:'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit tag 3: [Verse]' }));
    fireEvent.change(screen.getByLabelText('Edit selected tag'), { target: { value: 'Bridge' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const replaceCommand = applyCommand.mock.calls[0][0] as (text: string) => string;
    expect(replaceCommand(editorText)).toBe('[Verse]\nFirst\n[Chorus]\n[Bridge]');

    fireEvent.click(screen.getByRole('button', { name: 'Edit tag 1: [Verse]' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const deleteCommand = applyCommand.mock.calls[1][0] as (text: string) => string;
    expect(deleteCommand(editorText)).toBe('First\n[Chorus]\n[Verse]');

    rerender(
      <CommandPanel
        applyCommand={applyCommand}
        editorText="No tags anymore"
        insertTag={insertTag}
      />,
    );
    expect(screen.queryByText('[Verse]')).toBeNull();
    expect(screen.getByText('No tags in active editor')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close Tags' }));
    expect(screen.queryByRole('dialog', { name: 'Suno Tags' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Suno Clean' }));
    expect(applyCommand).toHaveBeenCalledWith(clean);
  });

  it('keeps long and numerous tags inside their own scrollable list', () => {
    const longTag = `Ambient ${'orchestral '.repeat(18)}ending`;
    const editorText = [
      '[Short]',
      `[${longTag}]`,
      ...Array.from({ length: 24 }, (_, index) => `[Section ${index + 1}]`),
    ].join('\n');

    render(
      <CommandPanel
        applyCommand={vi.fn()}
        editorText={editorText}
        insertTag={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    const list = screen.getByRole('list');
    expect(list.classList.contains('tag-list-scroll')).toBe(true);
    expect(screen.getByText('[Short]')).toBeDefined();
    expect(screen.getByTitle(`[${longTag}]`).classList.contains('tag-list-select')).toBe(true);
    expect(screen.getAllByRole('listitem')).toHaveLength(26);
  });

  it('keeps the Tags panel over the editor opposite to the active one', () => {
    const { rerender } = render(
      <CommandPanel
        activeEditor="left"
        applyCommand={vi.fn()}
        editorText="[Verse]"
        insertTag={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    const panel = screen.getByRole('dialog', { name: 'Suno Tags' });
    expect(panel.classList.contains('is-opposite-left')).toBe(true);

    rerender(
      <CommandPanel
        activeEditor="right"
        applyCommand={vi.fn()}
        editorText="[Chorus]"
        insertTag={vi.fn()}
      />,
    );

    expect(panel.classList.contains('is-opposite-right')).toBe(true);
    expect(panel.classList.contains('is-opposite-left')).toBe(false);
  });

  it('closes the temporary Tags panel with Escape or when leaving Suno', () => {
    render(<CommandPanel applyCommand={vi.fn()} insertTag={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Suno Tags' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    expect(screen.queryByRole('dialog', { name: 'Suno Tags' })).toBeNull();
  });

  it('renders presets independently and preserves the History/Data actions', async () => {
    await db.presets.add({
      name: 'Saved preset',
      data: { type: 'chain', commands: ['text.upper'] },
      isFavorite: false,
      createdAt: 1,
      updatedAt: 1,
      order: 0,
    });
    const onOpenDrawer = vi.fn();
    render(
      <CommandPanel
        applyCommand={vi.fn()}
        insertTag={vi.fn()}
        onOpenDrawer={onOpenDrawer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Presets' }));
    expect(await screen.findByRole('button', { name: 'Saved preset' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(onOpenDrawer).toHaveBeenNthCalledWith(1, 'history');
    expect(onOpenDrawer).toHaveBeenNthCalledWith(2, 'data');
  });
});
