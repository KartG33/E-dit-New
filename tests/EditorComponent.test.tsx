import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../src/components/Editor/Editor';
import { EditorState } from '../src/hooks/useEditor';

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
      />
    );

    expect(screen.getByDisplayValue('test text')).toBeDefined();
    expect(screen.getByText('left Editor')).toBeDefined();
    
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect((undoBtn as HTMLButtonElement).disabled).toBe(true);

    const redoBtn = screen.getByTitle('Redo (Ctrl+Y)');
    expect((redoBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls updateValue on typing', async () => {
    const updateValue = vi.fn();
    render(
      <Editor
        id="main"
        value=""
        currentState={mockState}
        updateValue={updateValue}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={false}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText('Type or paste text here...');
    await userEvent.type(textarea, 'a');
    
    expect(updateValue).toHaveBeenCalled();
  });

  it('restores selection range on undo', () => {
    const { rerender } = render(
      <Editor
        id="left"
        value="A"
        currentState={{ value: 'A', selectionStart: 1, selectionEnd: 1 }}
        updateValue={vi.fn()}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={true}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate undo action
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
      />
    );
    
    // Selection should be restored to 0,0 via useEffect
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(0);
  });
});
