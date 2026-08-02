import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PresetManager } from '../src/components/Presets/PresetManager';
import { PresetsTab } from '../src/components/Commands/PresetsTab';
import { EditDatabase } from '../src/lib/db';

describe.sequential('Preset management', () => {
  let database: EditDatabase;

  beforeEach(async () => {
    database = new EditDatabase(`PresetManagerTest-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
  });

  it('creates, applies, edits, and deletes a command sequence', async () => {
    const applyCommand = vi.fn();
    render(
      <>
        <PresetsTab applyCommand={applyCommand} database={database} />
        <PresetManager onClose={vi.fn()} database={database} />
      </>,
    );

    await screen.findByText('No presets yet.');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Clean text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    await waitFor(async () => {
      expect(await database.presets.count()).toBe(1);
    });
    const presetButton = await waitFor(() => {
      const button = screen.getAllByRole('button', { name: 'Clean text' })
        .find(item => item.classList.contains('command-button'));
      expect(button).toBeDefined();
      return button!;
    });
    fireEvent.click(presetButton);
    const apply = applyCommand.mock.calls[0][0] as (text: string) => string;
    expect(apply('hello   world')).toBe('hello world');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Clean spacing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    await waitFor(async () => {
      expect((await database.presets.toArray())[0].name).toBe('Clean spacing');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(async () => {
      expect(await database.presets.count()).toBe(0);
    });
  }, 10_000);

  it('creates a find and replace preset and validates its pattern', async () => {
    const applyCommand = vi.fn();
    render(
      <>
        <PresetsTab applyCommand={applyCommand} database={database} />
        <PresetManager onClose={vi.fn()} database={database} />
      </>,
    );

    await screen.findByText('No presets yet.');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Replace greeting' } });
    fireEvent.click(screen.getByRole('button', { name: /Find & replace/ }));
    fireEvent.change(screen.getByLabelText('Find pattern'), { target: { value: '[' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByText('The search pattern is not a valid regular expression.')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Find pattern'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Replace with'), { target: { value: 'world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    const presetButton = await waitFor(() => {
      const button = screen.getAllByRole('button', { name: 'Replace greeting' })
        .find(item => item.classList.contains('command-button'));
      expect(button).toBeDefined();
      return button!;
    });
    fireEvent.click(presetButton);
    const apply = applyCommand.mock.calls[0][0] as (text: string) => string;
    expect(apply('hello, hello')).toBe('world, world');
  });

  it('prevents duplicate preset names', async () => {
    await database.presets.add({
      name: 'Existing',
      data: { type: 'chain', commands: ['text.spaces'] },
      isFavorite: false,
      createdAt: 1,
      updatedAt: 1,
      order: 0,
    });
    render(<PresetManager onClose={vi.fn()} database={database} />);

    await screen.findByRole('button', { name: /Existing/ });
    fireEvent.click(screen.getByRole('button', { name: 'New preset' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'existing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    expect(screen.getByText('A preset with this name already exists.')).toBeDefined();
    expect(await database.presets.count()).toBe(1);
  });

  it('adds a symbol removal action to a command sequence', async () => {
    render(<PresetManager onClose={vi.fn()} database={database} />);

    await screen.findByText('No presets yet.');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Remove headings' } });
    fireEvent.change(screen.getByLabelText('Add command'), { target: { value: 'symbol.remove:###' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Remove ###')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    await waitFor(async () => {
      expect((await database.presets.toArray())[0].data).toEqual({
        type: 'chain',
        commands: ['symbol.remove:###'],
      });
    });
  });

  it('closes with Escape and a backdrop click', () => {
    const onClose = vi.fn();
    render(<PresetManager onClose={onClose} database={database} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByTestId('preset-manager-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
