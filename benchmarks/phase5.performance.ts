import 'fake-indexeddb/auto';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { analyzeSymbols, removeTokenFromText } from '../src/lib/analyzer';
import { COMMAND_REGISTRY } from '../src/lib/commands/registry';
import {
  findSunoTags,
  insertSunoTag,
  removeSunoTag,
  replaceSunoTag,
} from '../src/lib/commands/suno';
import { useEditor } from '../src/hooks/useEditor';
import { db } from '../src/lib/db';
import { Editor, type EditorProps } from '../src/components/Editor/Editor';

const SIZES = [10_000, 50_000, 100_000] as const;
const ITERATIONS = 12;
const WARMUPS = 3;
const seed = [
  '[Verse 1 | warm synth]',
  '  hello,world !  **bold** --- 1. item',
  '[Chorus x2]',
  'second line with _emphasis_ and [Soft piano]',
  '',
].join('\n');

type Measurement = {
  action: string;
  size: number;
  averageMs: number;
  worstMs: number;
};

const results: Measurement[] = [];
let sink: unknown;

const makeText = (size: number): string => {
  const repeats = Math.ceil(size / seed.length);
  return seed.repeat(repeats).slice(0, size);
};

const measure = (action: string, size: number, operation: () => unknown) => {
  for (let index = 0; index < WARMUPS; index += 1) sink = operation();

  const samples: number[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const startedAt = performance.now();
    sink = operation();
    samples.push(performance.now() - startedAt);
  }

  results.push({
    action,
    size,
    averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
    worstMs: Math.max(...samples),
  });
};

const measureAsync = async (action: string, size: number, operation: () => Promise<unknown>) => {
  for (let index = 0; index < WARMUPS; index += 1) sink = await operation();

  const samples: number[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const startedAt = performance.now();
    sink = await operation();
    samples.push(performance.now() - startedAt);
  }

  results.push({
    action,
    size,
    averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
    worstMs: Math.max(...samples),
  });
};

const measurePrepared = (
  action: string,
  size: number,
  prepare: () => void,
  operation: () => void,
) => {
  for (let index = 0; index < WARMUPS; index += 1) {
    prepare();
    operation();
  }

  const samples: number[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    prepare();
    const startedAt = performance.now();
    operation();
    samples.push(performance.now() - startedAt);
  }

  results.push({
    action,
    size,
    averageMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
    worstMs: Math.max(...samples),
  });
};

describe('Phase 5 performance baseline', () => {
  beforeAll(async () => {
    await db.history.clear();
    await db.settings.clear();
  });

  afterAll(() => {
    void sink;
    console.log('PHASE5_BENCHMARK_RESULTS');
    console.log(JSON.stringify(results, null, 2));
    vi.restoreAllMocks();
  });

  for (const size of SIZES) {
    it(`measures text and Suno logic at ${size.toLocaleString()} characters`, () => {
      const text = makeText(size);

      for (const [commandId, command] of Object.entries(COMMAND_REGISTRY)) {
        if (!commandId.startsWith('text.') && !commandId.startsWith('suno.')) continue;
        measure(commandId, size, () => command(text));
      }

      measure('symbols.analyze', size, () => analyzeSymbols(text));
      measure('symbols.remove:-', size, () => removeTokenFromText(text, '-'));

      const occurrences = findSunoTags(text);
      const middleOccurrence = occurrences[Math.floor(occurrences.length / 2)];
      measure('tags.find', size, () => findSunoTags(text));
      measure('tags.insert', size, () => insertSunoTag(text, Math.floor(size / 2), Math.floor(size / 2), 'Bridge 2'));
      measure('tags.replace', size, () => replaceSunoTag(text, middleOccurrence, 'Bridge 2'));
      measure('tags.remove', size, () => removeSunoTag(text, middleOccurrence));

      expect(text).toHaveLength(size);
      expect(occurrences.length).toBeGreaterThan(0);
    });

    it(`measures Undo and Redo at ${size.toLocaleString()} characters`, async () => {
      const baseText = makeText(size);
      const changedText = `${baseText.slice(0, -1)}!`;
      const setSettingSpy = vi.spyOn(db, 'setSetting').mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() => useEditor('left'));

      await waitFor(() => expect(result.current.hydrated).toBe(true));

      act(() => result.current.updateValue(baseText, size, size));
      act(() => result.current.updateValue(changedText, size, size));

      measurePrepared(
        'editor.undo',
        size,
        () => act(() => result.current.redo()),
        () => act(() => result.current.undo()),
      );
      measurePrepared(
        'editor.redo',
        size,
        () => act(() => result.current.undo()),
        () => act(() => result.current.redo()),
      );

      unmount();
      setSettingSpy.mockRestore();
    });

    it(`measures controlled editor rendering at ${size.toLocaleString()} characters`, () => {
      const baseText = makeText(size);
      const changedText = baseText.toUpperCase();
      const props: EditorProps = {
        id: 'left',
        value: baseText,
        currentState: { value: baseText, selectionStart: size, selectionEnd: size },
        updateValue: vi.fn(),
        onSelect: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: true,
        canRedo: true,
        isActive: true,
        onFocus: vi.fn(),
        hydrated: true,
      };
      const view = render(createElement(Editor, props));
      let useChangedText = true;

      measure('editor.render-update', size, () => {
        const value = useChangedText ? changedText : baseText;
        useChangedText = !useChangedText;
        view.rerender(createElement(Editor, {
          ...props,
          value,
          currentState: { value, selectionStart: value.length, selectionEnd: value.length },
        }));
        return value.length;
      });

      view.unmount();
    });

    it(`measures autosave persistence at ${size.toLocaleString()} characters`, async () => {
      await db.history.clear();
      await db.settings.clear();
      const baseText = makeText(size);
      let version = 0;

      await measureAsync('autosave.persist', size, async () => {
        version += 1;
        const text = `${baseText.slice(0, -8)}${String(version).padStart(8, '0')}`;
        await Promise.all([
          db.setSetting('editorLeftText', text),
          db.addHistory({ editorId: 'left', text, timestamp: version }),
        ]);
      });

      expect(await db.history.where('editorId').equals('left').count()).toBe(WARMUPS + ITERATIONS);
    });
  }
});
