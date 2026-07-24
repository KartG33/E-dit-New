import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '../src/hooks/useEditor';
import { useSymbolAnalyzer } from '../src/hooks/useSymbolAnalyzer';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';

describe('useEditor Hook', () => {
  beforeEach(async () => {
    await db.history.clear();
    await db.settings.clear();
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('has initial empty state', async () => {
    const { result } = renderHook(() => useEditor('left'));
    // Wait for hydration
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.value).toBe('');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo first change returns to empty string', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    
    act(() => {
      result.current.updateValue('hello');
    });
    
    expect(result.current.value).toBe('hello');
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.value).toBe('');
    expect(result.current.canRedo).toBe(true);
  });

  it('undo and redo multiple changes', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    
    act(() => { result.current.updateValue('1'); });
    act(() => { result.current.updateValue('12'); });
    act(() => { result.current.updateValue('123'); });
    
    expect(result.current.value).toBe('123');
    
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('12');
    
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('1');
    
    act(() => { result.current.redo(); });
    expect(result.current.value).toBe('12');
  });

  it('new change deletes redo branch', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    
    act(() => { result.current.updateValue('A'); });
    act(() => { result.current.updateValue('B'); });
    act(() => { result.current.undo(); }); // Back to A
    
    expect(result.current.canRedo).toBe(true);
    
    act(() => { result.current.updateValue('C'); }); // Should clear B
    expect(result.current.canRedo).toBe(false);
    expect(result.current.value).toBe('C');
    
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('A');
  });

  it('limits max history to 100', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    
    for (let i = 1; i <= 105; i++) {
      act(() => { result.current.updateValue(i.toString()); });
    }
    
    // We can only undo 100 times (100 changes + 1 initial state = 101 states)
    for (let i = 0; i < 100; i++) {
      act(() => { result.current.undo(); });
    }
    
    expect(result.current.canUndo).toBe(false);
    expect(result.current.value).toBe('6'); // 105 - 100 + 1 = 6
  });
  
  it('saves to persistent DB after debounce', async () => {
    const { result } = renderHook(() => useEditor('right')); // avoid 'main' since we removed it
    
    // Hydration happens async.
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    
    act(() => {
      result.current.updateValue('persistent text');
    });
    
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    await vi.waitFor(async () => {
      const count = await db.history.where('editorId').equals('right').count();
      expect(count).toBe(1);
    });
    
    const records = await db.history.where('editorId').equals('right').toArray();
    expect(records[0].text).toBe('persistent text');
  });
});

describe('useSymbolAnalyzer Hook', () => {
  it('correctly counts symbols and lines after debounce', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ text }) => useSymbolAnalyzer(text, 300), {
      initialProps: { text: '' }
    });
    
    expect(result.current.characters).toBe(0);
    
    rerender({ text: 'hello world\nline 2  ' });
    
    // Before debounce
    expect(result.current.characters).toBe(0);
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // After debounce
    expect(result.current.characters).toBe(20);
    expect(result.current.charactersWithoutSpaces).toBe(15);
    expect(result.current.words).toBe(4);
    expect(result.current.lines).toBe(2);
    
    vi.useRealTimers();
  });
});
