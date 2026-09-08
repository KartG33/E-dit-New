import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/lib/db';
import { EditorPersistence, importWithEditors } from '../src/lib/editorPersistence';
import { importDataFile, parseDataFile } from '../src/lib/data/import';

describe('editor persistence coordination', () => {
  beforeEach(async () => { localStorage.clear(); await db.settings.clear(); await db.history.clear(); });
  afterEach(() => vi.restoreAllMocks());
  it('journals an edit synchronously and recovers it before a debounced save', async () => {
    const editor = new EditorPersistence('left');
    editor.update('last typed line');
    expect(await db.getSetting('editorLeftText')).toBeUndefined();
    const recovered = new EditorPersistence('left');
    expect(recovered.recover('old database text')).toBe('last typed line');
    await editor.flush(); await recovered.flush();
    expect(await db.getSetting('editorLeftText')).toBe('last typed line');
    expect(localStorage.getItem(editor.recoveryKey)).toBeNull();
  });
  it('keeps recovery and a retryable error when the database write fails', async () => {
    const editor = new EditorPersistence('left');
    editor.update('must not disappear');
    const fail = vi.spyOn(db, 'setSetting').mockRejectedValueOnce(new Error('quota'));
    await expect(editor.flush()).rejects.toThrow('quota');
    expect(editor.status).toBe('error');
    expect(localStorage.getItem(editor.recoveryKey)).toContain('must not disappear');
    fail.mockRestore();
    await editor.flush();
    expect(editor.status).toBe('saved');
    expect(await db.getSetting('editorLeftText')).toBe('must not disappear');
  });
  it('drains pending saves before importing and does not overwrite the imported value', async () => {
    const editor = new EditorPersistence('left');
    const unregister = editor.register();
    try {
      editor.update('old pending value');
      await importWithEditors(() => importDataFile(JSON.stringify({ version: 2, timestamp: 1, presets: [], settings: [{ key: 'editorLeftText', value: 'imported' }] })));
      await editor.flush();
      expect(await db.getSetting('editorLeftText')).toBe('imported');
      expect(localStorage.getItem(editor.recoveryKey)).toBeNull();
    } finally { unregister(); }
  });
  it('does not mark newer text saved when an older write finishes', async () => {
    const editor = new EditorPersistence('right');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const original = db.setSetting.bind(db);
    vi.spyOn(db, 'setSetting').mockImplementationOnce(async (key, value) => { await gate; await original(key, value); });
    editor.update('first');
    const saving = editor.flush();
    editor.update('second');
    release(); await saving;
    expect(await db.getSetting('editorRightText')).toBe('second');
    expect(editor.status).toBe('saved');
  });
  it.each(['toString', 'constructor', '__proto__'])('rejects inherited identifier %s', key => {
    expect(() => parseDataFile(JSON.stringify({ version: 2, timestamp: 1, presets: [], settings: [{ key, value: 'x' }] }))).toThrow();
  });
});
