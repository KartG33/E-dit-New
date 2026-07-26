import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '../src/hooks/useEditor';
import { useSymbolAnalyzer } from '../src/hooks/useSymbolAnalyzer';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { StrictMode } from 'react';

describe('useEditor Hook', () => {
  beforeEach(async () => {
    await db.history.clear();
    await db.settings.clear();
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('has initial empty state and hydrates correctly', async () => {
    await db.setSetting('editorLeftText', 'hydrated text');
    const { result } = renderHook(() => useEditor('left'));
    expect(result.current.hydrated).toBe(false);
    
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.value).toBe('hydrated text');
  });

  it('handles hydration error gracefully', async () => {
    vi.spyOn(db, 'getSetting').mockRejectedValueOnce(new Error('DB Error'));
    let errorFired = false;
    window.addEventListener('app-error', () => { errorFired = true; }, { once: true });
    
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true)); // Hydrated flag should still flip to true to unlock the editor
    expect(errorFired).toBe(true);
  });

  it('ignores early updates during hydration', async () => {
    const { result } = renderHook(() => useEditor('left'));
    act(() => {
      result.current.updateValue('early text');
    });
    // Since it's ignored, value shouldn't be early text
    expect(result.current.value).toBe('');
    
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.value).toBe(''); // Textarea should have been disabled anyway
  });

  it('undo first change returns to empty string and saves to DB without history append', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    
    act(() => {
      result.current.updateValue('hello');
    });
    
    expect(result.current.value).toBe('hello');
    
    // Now trigger undo before debounce completes
    act(() => {
      result.current.undo();
    });

    expect(result.current.value).toBe('');
    
    // Let debounce finish (should be cancelled by undo)
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // DB Should just have empty string
    const val = await db.getSetting('editorLeftText');
    expect(val).toBe('');

    // History shouldn't be updated by undo
    const hist = await db.history.where('editorId').equals('left').toArray();
    expect(hist.length).toBe(0); // or 1 if empty string was pushed, but wait, empty string wasn't pushed because debounce was cancelled
  });

  it('does not store duplicate consecutive history records', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    
    act(() => { result.current.updateValue('1'); });
    act(() => { result.current.updateValue('1'); }); // duplicate
    
    act(() => { vi.advanceTimersByTime(2100); });
    
    await vi.waitFor(async () => {
      const records = await db.history.where('editorId').equals('left').toArray();
      expect(records.length).toBe(1); // Only one '1'
    });
  });

  it('undo and redo multiple changes', async () => {
    const { result } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    
    act(() => { result.current.updateValue('1'); });
    act(() => { result.current.updateValue('12'); });
    act(() => { result.current.updateValue('123'); });
    
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.value).toBe('123');
    
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('12');
    
    act(() => { result.current.undo(); });
    expect(result.current.value).toBe('1');
    
    act(() => { result.current.redo(); });
    expect(result.current.value).toBe('12');
  });

  it('works correctly in StrictMode (does not double register or cause issues)', async () => {
    // strict mode test
    const { result } = renderHook(() => useEditor('right'), { wrapper: StrictMode });
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.value).toBe('');
  });

  it('flushes save on unmount before debounce finishes', async () => {
    const { result, unmount } = renderHook(() => useEditor('left'));
    await vi.waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    
    act(() => { result.current.updateValue('unmount text'); });
    
    // Unmount before 2100ms
    unmount();
    
    const text = await db.getSetting('editorLeftText');
    expect(text).toBe('unmount text');
  });
});
