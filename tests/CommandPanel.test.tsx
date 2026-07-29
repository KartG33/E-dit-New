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
    render(<CommandPanel applyCommand={applyCommand} insertText={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Spaces' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Suno Clean' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Spaces' }));
    expect(applyCommand).toHaveBeenCalledWith(collapseSpaces);
  });

  it('switches to the Suno section without changing its commands or tag builder', () => {
    const applyCommand = vi.fn();
    render(<CommandPanel applyCommand={applyCommand} insertText={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));

    expect(screen.queryByRole('button', { name: 'Spaces' })).toBeNull();
    expect(screen.getByText('Tag Builder')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Suno Clean' }));
    expect(applyCommand).toHaveBeenCalledWith(clean);
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
        insertText={vi.fn()}
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
