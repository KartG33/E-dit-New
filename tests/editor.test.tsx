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

    // Before 2000ms timer fires, DB should not have saved 'ABC'
    let savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBeUndefined();

    // Advance fake timers by 2000ms
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

    // 1st change + wait 2s
    act(() => { result.current.updateValue('Hello'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    // 2nd change (same text) + wait 2s
    act(() => { result.current.updateValue('Hello'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const history1 = await db.history.where('editorId').equals('left').toArray();
    expect(history1.length).toBe(1);
    expect(history1[0].text).toBe('Hello');

    // 3rd change (different text) + wait 2s
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

    // Undo before 2000ms timer completes
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('');

    // Advance fake timers by 2000ms
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    // DB should have saved the restored value (''), not 'Typing...'
    const savedText = await db.getSetting('editorLeftText');
    expect(savedText).toBe('');

    const history = await db.history.where('editorId').equals('left').toArray();
    expect(history.length).toBe(0);
  });

  it('flushes pending change once on unmount', async () => {
    const { result, unmount } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

    act(() => { result.current.updateValue('Unmounting text'); });

    // Unmount before 2000ms
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

    // Call updateValue with exact same text
    act(() => { result.current.updateValue('Same Text'); });

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    const historyAfterSecond = await db.history.where('editorId').equals('left').toArray();
    expect(historyAfterSecond.length).toBe(1);
  });

  it('undo and redo multiple changes', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await act(async () => { await vi.runAllTimersAsync(); });

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
});
