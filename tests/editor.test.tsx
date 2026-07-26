import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '../src/hooks/useEditor';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { StrictMode } from 'react';

describe('useEditor Hook Autosave & Hydration', () => {
  beforeEach(async () => {
    await db.history.clear();
    await db.settings.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('restores left and right editors independently', async () => {
    await db.setSetting('editorLeftText', 'Left Content');
    await db.setSetting('editorRightText', 'Right Content');

    const { result: left } = renderHook(() => useEditor('left'));
    const { result: right } = renderHook(() => useEditor('right'));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(left.current.hydrated).toBe(true);
    expect(right.current.hydrated).toBe(true);
    expect(left.current.value).toBe('Left Content');
    expect(right.current.value).toBe('Right Content');
  });

  it('handles hydration error gracefully', async () => {
    vi.spyOn(db, 'getSetting').mockRejectedValueOnce(new Error('DB Error'));
    let errorFired = false;
    const handler = () => { errorFired = true; };
    window.addEventListener('app-error', handler, { once: true });
    
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.hydrated).toBe(true);
    expect(errorFired).toBe(true);
  });

  it('ignores early updates during hydration', async () => {
    const { result } = renderHook(() => useEditor('left'));
    act(() => {
      result.current.updateValue('early text');
    });
    expect(result.current.value).toBe('');
    
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.value).toBe('');
  });

  it('saves only once after multiple rapid changes within 2 seconds', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('A'); });
    act(() => { result.current.updateValue('AB'); });
    act(() => { result.current.updateValue('ABC'); });

    let savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBeUndefined();

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBe('ABC');

    const history = await db.history.where('editorId').equals('left').toArray();
    expect(history.length).toBe(1);
    expect(history[0].text).toBe('ABC');
  });

  it('prevents duplicate history entries after multiple pauses', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Hello'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    act(() => { result.current.updateValue('Hello'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const history1 = await db.history.where('editorId').equals('left').toArray();
    expect(history1.length).toBe(1);
    expect(history1[0].text).toBe('Hello');

    act(() => { result.current.updateValue('Hello World'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const history2 = await db.history.where('editorId').equals('left').toArray();
    expect(history2.length).toBe(2);
    expect(history2[1].text).toBe('Hello World');
  });

  it('cancels pending timer on Undo and does not save undone text', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Typing...'); });
    expect(result.current.value).toBe('Typing...');

    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('');

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBe('');

    const history = await db.history.where('editorId').equals('left').toArray();
    expect(history.length).toBe(0);
  });

  it('flushes pending change once on unmount', async () => {
    const { result, unmount } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Unmounting text'); });

    unmount();

    await act(async () => { await vi.runAllTimersAsync(); });

    const savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBe('Unmounting text');

    const history = await db.history.where('editorId').equals('left').toArray();
    expect(history.length).toBe(1);
    expect(history[0].text).toBe('Unmounting text');
  });

  it('works properly in StrictMode without creating empty or duplicate entries', async () => {
    const { result } = renderHook(() => useEditor('left'), { wrapper: StrictMode });
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.hydrated).toBe(true);
    expect(result.current.value).toBe('');

    const history = await db.history.where('editorId').equals('left').toArray();
    expect(history.length).toBe(0);
  });

  it('does not schedule a save timer if updateValue is called with unchanged text', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Same Text'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const historyAfterFirst = await db.history.where('editorId').equals('left').toArray();
    expect(historyAfterFirst.length).toBe(1);

    act(() => { result.current.updateValue('Same Text'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const historyAfterSecond = await db.history.where('editorId').equals('left').toArray();
    expect(historyAfterSecond.length).toBe(1);
  });

  it('returns to initial startup text on first Undo', async () => {
    await db.setSetting('editorLeftText', 'Startup Text');
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(result.current.value).toBe('Startup Text');
    expect(result.current.canUndo).toBe(false);

    act(() => { result.current.updateValue('Modified Text'); });
    expect(result.current.canUndo).toBe(true);

    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('Startup Text');
    expect(result.current.canUndo).toBe(false);
  });

  it('discards Redo branch when a new change occurs after Undo', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('State 1'); });
    act(() => { result.current.updateValue('State 2'); });

    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('State 1');
    expect(result.current.canRedo).toBe(true);

    // New change should clear Redo branch
    act(() => { result.current.updateValue('State 3 (New Branch)'); });
    expect(result.current.value).toBe('State 3 (New Branch)');
    expect(result.current.canRedo).toBe(false);

    act(() => { result.current.redo(); }); // should be no-op
    expect(result.current.value).toBe('State 3 (New Branch)');
  });

  it('limits memory history stack to MAX_HISTORY (100) items', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    for (let i = 1; i <= 105; i++) {
      act(() => { result.current.updateValue(`Text ${i}`); });
    }

    expect(result.current.value).toBe('Text 105');
    
    // Undo 100 times until reaching the start of trimmed memory history
    let undoCount = 0;
    while (result.current.canUndo) {
      act(() => { result.current.undo(); });
      undoCount++;
    }

    expect(undoCount).toBe(99);
    expect(result.current.value).toBe('Text 6'); // Oldest state remaining in memory after shift
  });

  it('stores and restores selectionStart and selectionEnd on Undo and Redo', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Hello World', 5, 5); });
    expect(result.current.currentState.selectionStart).toBe(5);
    expect(result.current.currentState.selectionEnd).toBe(5);

    act(() => { result.current.updateValue('Hello Beautiful World', 15, 15); });
    expect(result.current.currentState.selectionStart).toBe(15);

    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('Hello World');
    expect(result.current.currentState.selectionStart).toBe(5);
    expect(result.current.currentState.selectionEnd).toBe(5);

    act(() => { result.current.redo(); });
    expect(result.current.value).toBe('Hello Beautiful World');
    expect(result.current.currentState.selectionStart).toBe(15);
    expect(result.current.currentState.selectionEnd).toBe(15);
  });

  it('does not create new history step when cursor selection changes without text change', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Sample Text', 0, 0); });
    expect(result.current.canUndo).toBe(true);

    // Change selection only via onSelect
    act(() => { result.current.onSelect(2, 6); });

    expect(result.current.value).toBe('Sample Text');
    expect(result.current.currentState.selectionStart).toBe(2);
    expect(result.current.currentState.selectionEnd).toBe(6);

    // First undo should return directly to initial empty state, proving no intermediate step was added
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('');
    expect(result.current.canUndo).toBe(false);
  });
});
