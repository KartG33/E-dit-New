import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPanel } from '../src/components/Commands/CommandPanel';
import { SunoTagsPanel } from '../src/components/SunoTags/SunoTagsPanel';
import { collapseSpaces } from '../src/lib/commands/text';
import { db } from '../src/lib/db';

describe('CommandPanel', () => {
  beforeEach(async () => {
    await db.presets.clear();
  });

  it('keeps Text commands as the default independent section', () => {
    const applyCommand = vi.fn();
    render(<CommandPanel applyCommand={applyCommand} />);

    expect(screen.getByRole('button', { name: 'Spaces' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Suno Clean' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Text' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Spaces' }));
    expect(applyCommand).toHaveBeenCalledWith(collapseSpaces);
  });

  it('controls the Tags workspace from the Suno toolbar and closes it when leaving Suno', () => {
    const onTagsOpenChange = vi.fn();
    const { rerender } = render(
      <CommandPanel
        applyCommand={vi.fn()}
        tagsOpen={false}
        onTagsOpenChange={onTagsOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(onTagsOpenChange).toHaveBeenLastCalledWith(true);

    rerender(
      <CommandPanel
        applyCommand={vi.fn()}
        tagsOpen
        onTagsOpenChange={onTagsOpenChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Tags' }).getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    expect(onTagsOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('shows tags in text order and supports inserting, editing, and deleting them', () => {
    const applyCommand = vi.fn();
    const insertTag = vi.fn();
    const onClose = vi.fn();
    const editorText = '[Verse]\nFirst\n[Chorus]\n[Verse]';
    const { rerender } = render(
      <SunoTagsPanel
        editorKey="left"
        editorText={editorText}
        onInsert={insertTag}
        onChangeText={applyCommand}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Suno Tags' })).toBeDefined();
    expect(screen.getByText('Add tag')).toBeDefined();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '[Verse]',
      '[Chorus]',
      '[Verse]',
    ]);

    fireEvent.change(screen.getByLabelText('Number'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }));
    expect(insertTag).toHaveBeenCalledWith('Chorus 2');

    fireEvent.change(screen.getByLabelText('Number'), { target: { value: 'wrong' } });
    expect((screen.getByRole('button', { name: 'Chorus' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Custom tag'), { target: { value: 'Whispered Vocal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(insertTag).toHaveBeenLastCalledWith('Whispered Vocal');

    fireEvent.click(screen.getByRole('button', { name: 'Edit tag 3: [Verse]' }));
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'Bridge' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const replaceCommand = applyCommand.mock.calls[0][0] as (text: string) => string;
    expect(replaceCommand(editorText)).toBe('[Verse]\nFirst\n[Chorus]\n[Bridge]');

    fireEvent.click(screen.getByRole('button', { name: 'Edit tag 1: [Verse]' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const deleteCommand = applyCommand.mock.calls[1][0] as (text: string) => string;
    expect(deleteCommand(editorText)).toBe('First\n[Chorus]\n[Verse]');

    rerender(
      <SunoTagsPanel
        editorKey="left"
        editorText="No tags anymore"
        onInsert={insertTag}
        onChangeText={applyCommand}
        onClose={onClose}
      />,
    );
    expect(screen.queryByText('[Verse]')).toBeNull();
    expect(screen.getByText('No tags in active editor')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close Tags' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps long and numerous tags inside their own scrollable list', () => {
    const longTag = `Ambient ${'orchestral '.repeat(18)}ending`;
    const editorText = [
      '[Short]',
      `[${longTag}]`,
      ...Array.from({ length: 24 }, (_, index) => `[Section ${index + 1}]`),
    ].join('\n');

    render(
      <SunoTagsPanel
        editorKey="right"
        editorText={editorText}
        onInsert={vi.fn()}
        onChangeText={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const list = screen.getByRole('list');
    expect(list.classList.contains('tag-list-scroll')).toBe(true);
    expect(screen.getByText('[Short]')).toBeDefined();
    expect(screen.getByTitle(`[${longTag}]`).classList.contains('tag-list-select')).toBe(true);
    expect(screen.getAllByRole('listitem')).toHaveLength(26);
  });

  it('closes the Tags workspace with Escape', () => {
    const onClose = vi.fn();
    render(
      <SunoTagsPanel
        editorKey="left"
        editorText="[Verse]"
        onInsert={vi.fn()}
        onChangeText={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
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
