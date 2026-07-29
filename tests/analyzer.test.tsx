import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { analyzeSymbols, removeTokenFromText } from '../src/lib/analyzer';
import { useSymbolAnalyzer } from '../src/hooks/useSymbolAnalyzer';
import { Editor } from '../src/components/Editor/Editor';

describe('Symbol Analyzer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports compound and single tokens longest-match-first', () => {
    const text = '--- - ... . === == = ``` ` ** * __ _';
    const counts = analyzeSymbols(text);
    const tokens = Object.fromEntries(counts.map(t => [t.token, t.count]));

    expect(tokens['---']).toBe(1);
    expect(tokens['-']).toBe(1);
    expect(tokens['...']).toBe(1);
    expect(tokens['.']).toBe(1);
    expect(tokens['===']).toBe(1);
    expect(tokens['==']).toBe(1);
    expect(tokens['=']).toBe(1);
    expect(tokens['```']).toBe(1);
    expect(tokens['`']).toBe(1);
    expect(tokens['**']).toBe(1);
    expect(tokens['*']).toBe(1);
    expect(tokens['__']).toBe(1);
    expect(tokens['_']).toBe(1);
  });

  it('removes single tokens without destroying compound tokens', () => {
    expect(removeTokenFromText('--- - --', '-')).toBe('---  --');
    expect(removeTokenFromText('** * *', '*')).toBe('**  ');
    expect(removeTokenFromText('=== == =', '=')).toBe('=== == ');
    expect(removeTokenFromText('... .', '.')).toBe('... ');
    expect(removeTokenFromText('``` `', '`')).toBe('``` ');
  });

  it('preserves indentation and text when removing numbered lists', () => {
    const text = '  1. Hello\n    2. World';
    const result = removeTokenFromText(text, 'List (1.)');
    expect(result).toBe('  Hello\n    World');
  });

  it('handles empty text, CRLF, and Unicode characters', () => {
    expect(analyzeSymbols('')).toEqual([]);

    const crlfText = '--- - \r\n 1. Test \r\n ** *';
    const countsCrlf = analyzeSymbols(crlfText);
    const tokensCrlf = Object.fromEntries(countsCrlf.map(t => [t.token, t.count]));

    expect(tokensCrlf['---']).toBe(1);
    expect(tokensCrlf['-']).toBe(1);
    expect(tokensCrlf['List (1.)']).toBe(1);
    expect(tokensCrlf['**']).toBe(1);
    expect(tokensCrlf['*']).toBe(1);

    const unicodeText = 'Привет 🚀 --- - $ %';
    const countsUnicode = analyzeSymbols(unicodeText);
    const tokensUnicode = Object.fromEntries(countsUnicode.map(t => [t.token, t.count]));
    expect(tokensUnicode['---']).toBe(1);
    expect(tokensUnicode['-']).toBe(1);
    expect(tokensUnicode['$']).toBe(1);
    expect(tokensUnicode['%']).toBe(1);
  });

  it('debounces analysis by 300 ms', async () => {
    const { result, rerender } = renderHook(({ text }) => useSymbolAnalyzer(text, 300), {
      initialProps: { text: 'Initial' }
    });

    expect(result.current.characters).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.characters).toBe(7);

    rerender({ text: 'Updated Text' });
    expect(result.current.characters).toBe(7);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.characters).toBe(12);
  });

  it('cancels previous pending analysis on rapid text changes', async () => {
    const { result, rerender } = renderHook(({ text }) => useSymbolAnalyzer(text, 300), {
      initialProps: { text: 'First' }
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ text: 'Second' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ text: 'Third' });

    expect(result.current.characters).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.characters).toBe(5);
    expect(result.current.lines).toBe(1);
  });

  it('renders compact statistics in both editor headers and symbol-only chip labels', () => {
    render(
      <div>
        <Editor
          id="left"
          value={'a b\nc'}
          currentState={{ value: 'a b\nc', selectionStart: 0, selectionEnd: 0 }}
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
        <Editor
          id="right"
          value={'--- ---\ntext'}
          currentState={{ value: '--- ---\ntext', selectionStart: 0, selectionEnd: 0 }}
          updateValue={vi.fn()}
          undo={vi.fn()}
          redo={vi.fn()}
          canUndo={false}
          canRedo={false}
          isActive={false}
          onFocus={vi.fn()}
          onSelect={vi.fn()}
          hydrated={true}
        />
      </div>
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const [leftStats, rightStats] = screen.getAllByTestId('editor-stats');
    expect(leftStats.textContent).toBe('5 chars·2 lines');
    expect(rightStats.textContent).toBe('12 chars·2 lines');
    expect(leftStats.parentElement?.classList.contains('editor-header')).toBe(true);
    expect(rightStats.parentElement?.classList.contains('editor-header')).toBe(true);
    expect(screen.queryByText(/words|no space/)).toBeNull();

    const chip = screen.getByTitle('Remove all ---');
    expect(chip.textContent).toBe('---');
    expect(chip.closest('.editor-footer')?.querySelector('[data-testid="editor-stats"]')).toBeNull();
  });

  it('calls updateValue exactly once when a symbol chip is clicked in Editor', () => {
    const updateValue = vi.fn();

    render(
      <Editor
        id="left"
        value="--- - hello"
        currentState={{ value: '--- - hello', selectionStart: 0, selectionEnd: 0 }}
        updateValue={updateValue}
        undo={vi.fn()}
        redo={vi.fn()}
        canUndo={true}
        canRedo={false}
        isActive={true}
        onFocus={vi.fn()}
        onSelect={vi.fn()}
        hydrated={true}
      />
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const chip = screen.getByTitle('Remove all -');
    expect(chip.textContent).toBe('-');
    fireEvent.click(chip);

    expect(updateValue).toHaveBeenCalledTimes(1);
    expect(updateValue).toHaveBeenCalledWith('---  hello', undefined, undefined, true);
  });
});
