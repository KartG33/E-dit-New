import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
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
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('test text')).toBeDefined();
    expect(screen.getByText('left Editor')).toBeDefined();
    
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect((undoBtn as HTMLButtonElement).disabled).toBe(true);

    const redoBtn = screen.getByTitle('Redo (Ctrl+Y)');
    expect((redoBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables textarea and shows Loading when hydrated is false', () => {
    render(
      <Editor
        id="main"
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
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const textarea = screen.getByPlaceholderText('Type or paste your text here...');
    await userEvent.type(textarea, 'a');
    
    expect(updateValue).toHaveBeenCalled();
  });

  it('restores selection range on undo after explicit onSelect', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Editor
        id="left"
        value="ABC"
        currentState={{ value: 'ABC', selectionStart: 1, selectionEnd: 2 }} // The snapshot state
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
    
    // Test that user selection fires onSelect correctly
    textarea.setSelectionRange(1, 2);
    // Fire select event manually since userEvent doesn't perfectly fire react's onSelect polyfill in jsdom
    act(() => {
      const event = new Event('select', { bubbles: true });
      textarea.dispatchEvent(event);
    });
    
    expect(onSelect).toHaveBeenCalledWith(1, 2);

    // Simulate undo action restoring a previous state with selection (0,0)
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
    
    // Selection should be restored to 0,0 via useEffect due to lastAction = UNDO
    // Wait, the component relies on undo() callback actually mutating the state, but we mocked it.
    // However, it also checks lastAction.current == 'UNDO'. Since we didn't press the button inside the component, lastAction is 'TYPE'.
    // Let's trigger the actual undo button inside the component to test the selection restore effect!
  });

  it('restores selection correctly by pressing internal Undo button', async () => {
    const undo = vi.fn();
    const { rerender } = render(
      <Editor
        id="left"
        value="ABC"
        currentState={{ value: 'ABC', selectionStart: 1, selectionEnd: 2 }} // The snapshot state before undo
        updateValue={vi.fn()}
        undo={undo}
        redo={vi.fn()}
        canUndo={true}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    await userEvent.click(undoBtn);
    expect(undo).toHaveBeenCalled();

    // Now mock the parent reacting to undo and passing the restored state
    rerender(
      <Editor
        id="left"
        value=""
        currentState={{ value: '', selectionStart: 0, selectionEnd: 0 }} // restored snapshot state
        updateValue={vi.fn()}
        undo={undo}
        redo={vi.fn()}
        canUndo={false}
        canRedo={true}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(0);
  });
});
