import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PresetManager } from '../apps/android/src/components/Presets/PresetManager';
import { ANDROID_BACK_REQUEST_EVENT } from '../apps/android/src/hooks/useAndroidAppLifecycle';
import { PresetsTab } from '../apps/android/src/components/Commands/PresetsTab';
import { EditDatabase } from '../apps/android/src/lib/db';

describe.sequential('Preset management', () => {
  let database: EditDatabase;

  beforeEach(async () => {
    database = new EditDatabase(`PresetManagerTest-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
  });

  it('restores independent drafts after closing without changing saved presets', async () => {
    const ids = await database.presets.bulkAdd([
      { name: 'First', data: { type: 'chain', commands: ['text.spaces'] }, isFavorite: false, createdAt: 1, updatedAt: 1 },
      { name: 'Second', data: { type: 'chain', commands: ['text.upper'] }, isFavorite: false, createdAt: 2, updatedAt: 2 },
    ], { allKeys: true });
    const view = render(<PresetManager onClose={vi.fn()} database={database} />);
    fireEvent.click(await screen.findByRole('button', { name: /First/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'First draft' } });
    fireEvent.click(screen.getByRole('button', { name: /Second/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Second draft' } });
    view.unmount();
    render(<PresetManager onClose={vi.fn()} database={database} />);
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Second draft'));
    fireEvent.click(screen.getByRole('button', { name: /First/ }));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('First draft');
    expect((await database.presets.get(ids[0]))?.name).toBe('First');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('First');
    fireEvent.click(screen.getByRole('button', { name: /Second/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    await screen.findByText('Saved.');
    expect((await database.presets.get(ids[1]))?.name).toBe('Second draft');
    expect(localStorage.getItem(`edit.preset-draft.${database.name}.${ids[1]}`)).toBeNull();
  });

  it('restores unfinished new steps and clears their draft only after saving', async () => {
    const view = render(<PresetManager onClose={vi.fn()} database={database} />);
    fireEvent.click(await screen.findByRole('button', { name: 'New preset' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unfinished' } });
    fireEvent.click(screen.getByRole('button', { name: /Add replacement/ }));
    view.unmount();
    render(<PresetManager onClose={vi.fn()} database={database} />);
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Unfinished'));
    expect((screen.getByLabelText('Find text 1') as HTMLInputElement).value).toBe('');
    expect(await database.presets.count()).toBe(0);
    fireEvent.change(screen.getByLabelText('Find text 1'), { target: { value: 'old' } });
    fireEvent.change(screen.getByLabelText('Replace with 1'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    await screen.findByText('Saved.');
    expect(await database.presets.count()).toBe(1);
    expect(localStorage.getItem(`edit.preset-draft.${database.name}.new`)).toBeNull();
  });

  it('removes a deleted preset draft and returns through the Android navigation levels', async () => {
    const id = await database.presets.add({ name: 'Delete me', data: { type: 'chain', commands: ['text.spaces'] }, isFavorite: false, createdAt: 1, updatedAt: 1 });
    const back = vi.fn();
    render(<PresetManager onClose={vi.fn()} onBack={back} database={database} />);
    fireEvent.click(await screen.findByRole('button', { name: /Delete me/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Draft' } });
    fireEvent(window, new Event(ANDROID_BACK_REQUEST_EVENT, { cancelable: true }));
    expect(back).not.toHaveBeenCalled();
    fireEvent(window, new Event(ANDROID_BACK_REQUEST_EVENT, { cancelable: true }));
    expect(back).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /Delete me/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(async () => expect(await database.presets.count()).toBe(0));
    await waitFor(() => expect(localStorage.getItem(`edit.preset-draft.${database.name}.${id}`)).toBeNull());
  });

  it('duplicates a preset with independent steps and no conflicting shortcut', async () => {
    const id = await database.presets.add({ name: 'Original', data: { type: 'chain', commands: ['text.spaces'] }, shortcut: { code: 'KeyK', ctrl: true, shift: true, alt: false, meta: false }, isFavorite: false, createdAt: 1, updatedAt: 1 });
    render(<PresetManager database={database} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Original/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate preset' }));
    await screen.findByText('Preset copied.');
    const items = await database.presets.toArray();
    const copy = items.find(item => item.id !== id)!;
    expect(copy.name).toBe('Original copy');
    expect(copy.shortcut).toBeUndefined();
    expect(copy.data).toEqual({ type: 'sequence', steps: [{ type: 'command', command: 'text.spaces' }] });
    expect(items.find(item => item.id === id)?.shortcut).toBeDefined();
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
    fireEvent.click(screen.getByRole('button', { name: /Add replacement/ }));
    fireEvent.click(screen.getByLabelText('Use regular expression 1'));
    fireEvent.change(screen.getByLabelText('Find text 1'), { target: { value: '[' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByText('Step 1: The search pattern is not a valid regular expression.')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Find text 1'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Replace with 1'), { target: { value: 'world' } });
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

  it('records a safe desktop shortcut and prevents conflicts', async () => {
    await database.presets.add({
      name: 'Existing shortcut',
      data: { type: 'chain', commands: ['text.lower'] },
      shortcut: { code: 'KeyK', ctrl: true, shift: true, alt: false, meta: false },
      isFavorite: false,
      createdAt: 1,
      updatedAt: 1,
      order: 0,
    });
    render(<PresetManager onClose={vi.fn()} database={database} />);

    await screen.findByRole('button', { name: /Existing shortcut/ });
    fireEvent.click(screen.getByRole('button', { name: 'New preset' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New shortcut' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign shortcut' }));
    fireEvent.keyDown(document, { key: 'K', code: 'KeyK', ctrlKey: true, shiftKey: true });
    expect(screen.getByText('This shortcut is already assigned to “Existing shortcut”.')).toBeDefined();

    fireEvent.keyDown(document, { key: 'M', code: 'KeyM', ctrlKey: true, shiftKey: true });
    await screen.findByRole('button', { name: 'Ctrl + Shift + M' });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    await waitFor(async () => {
      expect((await database.presets.where('name').equals('New shortcut').first())?.shortcut).toEqual({
        code: 'KeyM', ctrl: true, shift: true, alt: false, meta: false,
      });
    });
  });

  it('navigates between the mobile preset list and editor', async () => {
    await database.presets.add({
      name: 'Mobile preset',
      data: { type: 'chain', commands: ['text.spaces'] },
      isFavorite: false,
      createdAt: 1,
      updatedAt: 1,
      order: 0,
    });
    render(<PresetManager onClose={vi.fn()} database={database} />);

    const body = screen.getByTestId('preset-manager-body');
    expect(body.classList.contains('is-mobile-list')).toBe(true);

    fireEvent.click(await screen.findByRole('button', { name: /Mobile preset/ }));
    expect(body.classList.contains('is-mobile-editor')).toBe(true);
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Mobile preset');

    fireEvent.click(screen.getByRole('button', { name: 'Back to preset list' }));
    expect(body.classList.contains('is-mobile-list')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'New preset' }));
    expect(body.classList.contains('is-mobile-editor')).toBe(true);
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '');
  });

  it('returns to the preset list when the Android back request is handled in the editor', async () => {
    render(<PresetManager onClose={vi.fn()} database={database} />);

    await screen.findByText('No presets yet.');
    fireEvent.click(screen.getByRole('button', { name: 'New preset' }));
    const body = screen.getByTestId('preset-manager-body');
    expect(body.classList.contains('is-mobile-editor')).toBe(true);

    let handled = false;
    act(() => {
      handled = !window.dispatchEvent(new Event(ANDROID_BACK_REQUEST_EVENT, {
        cancelable: true,
      }));
    });

    expect(handled).toBe(true);
    expect(body.classList.contains('is-mobile-list')).toBe(true);
  });

  it('adds a symbol removal action to a command sequence', async () => {
    render(<PresetManager onClose={vi.fn()} database={database} />);

    await screen.findByText('No presets yet.');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Remove headings' } });
    fireEvent.change(screen.getByLabelText('Add command'), { target: { value: 'symbol.remove:###' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('1. Remove ###')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    await waitFor(async () => {
      expect((await database.presets.toArray())[0].data).toEqual({
        type: 'sequence',
        steps: [{ type: 'command', command: 'symbol.remove:###' }],
      });
    });
  });

  it('closes with Escape and a backdrop click', () => {
    const onClose = vi.fn();
    render(<PresetManager onClose={onClose} database={database} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByTestId('preset-manager-backdrop'));
    fireEvent.click(screen.getByTestId('preset-manager-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
