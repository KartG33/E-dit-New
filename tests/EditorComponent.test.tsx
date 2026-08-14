import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../src/components/Editor/Editor';
import { EditorState } from '../src/hooks/useEditor';
import { Clipboard } from '@capacitor/clipboard';
import { useState } from 'react';

vi.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    read: vi.fn(),
    write: vi.fn(),
  },
}));

const mockState: EditorState = { value: '', selectionStart: 0, selectionEnd: 0 };

describe('Editor Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with initial values and buttons', () => {
    const updateValue = vi.fn();
    const undo = vi.fn();
    const redo = vi.fn();
    const onFocus = vi.fn();

    render(
      <Editor
        id="left"
        value="test text"
        currentState={{ ...mockState, value: 'test text' }}
        updateValue={updateValue}
        undo={undo}
        redo={redo}
        canUndo={false}
        canRedo={true}
        isActive={true}
        onFocus={onFocus}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    expect(screen.getByDisplayValue('test text')).toBeDefined();
    expect(screen.queryByText('left Editor')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'left editor' }).classList.contains('editor-textarea')).toBe(true);
    const stats = screen.getByTestId('editor-stats');
    expect(stats.classList.contains('editor-stats')).toBe(true);
    expect(stats.parentElement?.classList.contains('editor-header')).toBe(true);
    
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect((undoBtn as HTMLButtonElement).disabled).toBe(true);

    const redoBtn = screen.getByTitle('Redo (Ctrl+Y)');
    expect((redoBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables textarea and shows Loading when hydrated is false', () => {
    render(
      <Editor
        id="left"
        value=""
        currentState={mockState}
        updateValue={vi.fn()}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Loading...');
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('calls updateValue on typing', async () => {
    const updateValue = vi.fn();
    render(
      <Editor
        id="left"
        value=""
        currentState={mockState}
        updateValue={updateValue}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const textarea = screen.getByPlaceholderText('Type or paste your text here...');
    await userEvent.type(textarea, 'a');
    
    expect(updateValue).toHaveBeenCalled();
  });

  it('copies the complete editor text', async () => {
    render(
      <Editor
        id="left"
        value="Copy me"
        currentState={{ value: 'Copy me', selectionStart: 2, selectionEnd: 4 }}
        updateValue={vi.fn()}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy all text' }));

    expect(Clipboard.write).toHaveBeenCalledWith({
      string: 'Copy me',
      label: 'E-dit editor text',
    });
  });

  it('pastes clipboard text over the current selection', async () => {
    vi.mocked(Clipboard.read).mockResolvedValue({ value: 'new', type: 'text/plain' });
    const updateValue = vi.fn();

    render(
      <Editor
        id="left"
        value="old text"
        currentState={{ value: 'old text', selectionStart: 0, selectionEnd: 3 }}
        updateValue={updateValue}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 3);
    await userEvent.click(screen.getByRole('button', { name: 'Paste' }));

    expect(updateValue).toHaveBeenCalledWith('new text', 3, 3, true);
  });

  it('keeps the caret at the end of pasted text after the controlled value updates', async () => {
    vi.mocked(Clipboard.read).mockResolvedValue({ value: 'new', type: 'text/plain' });

    const StatefulEditor = () => {
      const [state, setState] = useState<EditorState>({
        value: 'old text',
        selectionStart: 0,
        selectionEnd: 3,
      });

      return (
        <Editor
          id="left"
          value={state.value}
          currentState={state}
          updateValue={(value, selectionStart = 0, selectionEnd = 0) => {
            setState({ value, selectionStart, selectionEnd });
          }}
          undo={vi.fn()}
          redo={vi.fn()}
          canUndo={false}
          canRedo={false}
          isActive={true}
          onFocus={vi.fn()}
          onSelect={(selectionStart, selectionEnd) => {
            setState(current => ({ ...current, selectionStart, selectionEnd }));
          }}
          hydrated={true}
        />
      );
    };

    render(<StatefulEditor />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 3);
    fireEvent.select(textarea);

    await userEvent.click(screen.getByRole('button', { name: 'Paste' }));

    expect(textarea.value).toBe('new text');
    expect(textarea.selectionStart).toBe(3);
    expect(textarea.selectionEnd).toBe(3);
  });

  it('clears the editor through the undoable update path', async () => {
    const updateValue = vi.fn();

    render(
      <Editor
        id="left"
        value="Remove me"
        currentState={{ value: 'Remove me', selectionStart: 0, selectionEnd: 0 }}
        updateValue={updateValue}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear editor' }));

    expect(updateValue).toHaveBeenCalledWith('', 0, 0, true);
  });

  it('restores selection range on undo after explicit onSelect', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Editor
        id="left"
        value="ABC"
        currentState={{ value: 'ABC', selectionStart: 1, selectionEnd: 2 }}
        updateValue={vi.fn()}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={true}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={onSelect}
        hydrated={true}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    fireEvent.select(textarea, { target: { selectionStart: 1, selectionEnd: 2 } });
    expect(onSelect).toHaveBeenCalledWith(1, 2);

    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    await userEvent.click(undoBtn);

    rerender(
      <Editor
        id="left"
        value=""
        currentState={{ value: '', selectionStart: 0, selectionEnd: 0 }}
        updateValue={vi.fn()}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={true}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={onSelect}
        hydrated={true}
      />
    );
    
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(0);
  });

  it('triggers Undo / Redo hotkeys only when editor is active', () => {
    const undo = vi.fn();
    const redo = vi.fn();

    render(
      <Editor
        id="left"
        value="ABC"
        currentState={{ value: 'ABC', selectionStart: 0, selectionEnd: 0 }}
        updateValue={vi.fn()}
        undo={undo}
        redo={redo}
        canUndo={true}
        canRedo={true}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const textarea = screen.getByRole('textbox');

    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textarea, { key: 'y', ctrlKey: true });
    expect(redo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledTimes(2);
  });

  it('hotkey acts on active editor and does not act on inactive editor', () => {
    const leftUndo = vi.fn();
    const rightUndo = vi.fn();

    render(
      <div>
        <Editor
          id="left"
          value="Left Text"
          currentState={{ value: 'Left Text', selectionStart: 0, selectionEnd: 0 }}
          updateValue={vi.fn()}
          undo={leftUndo}
          redo={vi.fn()}
          canUndo={true}
          canRedo={false}
          isActive={true}
          onFocus={vi.fn()}
          onSelect={vi.fn()}
          hydrated={true}
        />
        <Editor
          id="right"
          value="Right Text"
          currentState={{ value: 'Right Text', selectionStart: 0, selectionEnd: 0 }}
          updateValue={vi.fn()}
          undo={rightUndo}
          redo={vi.fn()}
          canUndo={true}
          canRedo={false}
          isActive={false}
          onFocus={vi.fn()}
          onSelect={vi.fn()}
          hydrated={true}
        />
      </div>
    );

    const leftTextarea = screen.getByDisplayValue('Left Text');

    fireEvent.keyDown(leftTextarea, { key: 'z', ctrlKey: true });
    expect(leftUndo).toHaveBeenCalledTimes(1);
    expect(rightUndo).not.toHaveBeenCalled();
  });

  it('does not trigger editor hotkeys when typing inside form input or contenteditable', () => {
    const undo = vi.fn();

    render(
      <div>
        <input data-testid="search-input" type="text" />
        <div data-testid="editable" contentEditable={true} />
        <Editor
          id="left"
          value="ABC"
          currentState={{ value: 'ABC', selectionStart: 0, selectionEnd: 0 }}
          updateValue={vi.fn()}
          undo={undo}
          redo={vi.fn()}
          canUndo={true}
          canRedo={true}
          isActive={true}
          onFocus={vi.fn()}
          onSelect={vi.fn()}
          hydrated={true}
        />
      </div>
    );

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();

    const editable = screen.getByTestId('editable');
    fireEvent.keyDown(editable, { key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
  });

  it('triggers hotkeys after clicking a command button outside the textarea', () => {
    const undo = vi.fn();
    const redo = vi.fn();

    render(
      <div>
        <button data-testid="cmd-btn">Apply Command</button>
        <Editor
          id="left"
          value="ABC"
          currentState={{ value: 'ABC', selectionStart: 0, selectionEnd: 0 }}
          updateValue={vi.fn()}
          undo={undo}
          redo={redo}
          canUndo={true}
          canRedo={true}
          isActive={true}
          onFocus={vi.fn()}
          onSelect={vi.fn()}
          hydrated={true}
        />
      </div>
    );

    const btn = screen.getByTestId('cmd-btn');
    fireEvent.click(btn);

    fireEvent.keyDown(btn, { key: 'z', ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });
});
