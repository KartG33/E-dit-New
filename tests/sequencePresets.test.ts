import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import legacy from './fixtures/data-v2.json';
import { EditDatabase, type PresetData } from '../src/lib/db';
import { applyPreset } from '../src/lib/presets/execute';
import { importDataFile, parseDataFile } from '../src/lib/data/import';

describe('sequence presets and compatible data', () => {
  it('processes a 100,000-character input without losing its tail', () => {
    const text = 'draft:hello   '.repeat(7142) + 'tail!!!!!!!!';
    expect(text.length).toBe(100000);
    const result = applyPreset(text, { type: 'sequence', steps: [
      { type: 'remove', fragments: ['draft:'] },
      { type: 'replace', pattern: 'hello', replacement: 'world', regex: false, flags: 'g' },
      { type: 'command', command: 'text.spaces' },
    ] });
    expect(result).toBe('world '.repeat(7142) + 'tail!!!!!!!!');
  });
  it('combines literal replacement, removal and a command in order', () => {
    const data: PresetData = { type: 'sequence', steps: [
      { type: 'replace', pattern: '[Припев]', replacement: '[Chorus]', flags: 'g', regex: false },
      { type: 'remove', fragments: ['draft:'] },
      { type: 'command', command: 'text.spaces' },
    ] };
    expect(applyPreset('draft:[Припев]   hello', data)).toBe('[Chorus] hello');
  });
  it('keeps literal metacharacters and literal dollar replacements distinct from regex', () => {
    expect(applyPreset('4.5 4a5', { type: 'sequence', steps: [{ type: 'replace', pattern: '4.5', replacement: '$&', regex: false, flags: 'g' }] })).toBe('$& 4a5');
    const parsed = parseDataFile(JSON.stringify(legacy));
    expect(parsed.version).toBe(3);
    expect(applyPreset('FOO foo', parsed.presets[1].data)).toBe('[FOO] [foo]');
    expect(parsed.presets[0].shortcut).toEqual(legacy.presets[0].shortcut);
  });
  it('imports old data and round-trips the new format without losing settings', async () => {
    const database = new EditDatabase(`Sequence-${crypto.randomUUID()}`);
    try {
      await importDataFile(JSON.stringify(legacy), database);
      const data = { version: 3, timestamp: 2, presets: await database.presets.toArray(), settings: await database.settings.toArray() };
      expect(data.presets.every(preset => preset.data.type === 'sequence')).toBe(true);
      await importDataFile(JSON.stringify(data), database);
      expect(await database.settings.toArray()).toEqual(data.settings);
      expect(await database.presets.toArray()).toEqual(data.presets);
    } finally { await database.delete(); }
  });
  it('migrates an actual version 4 database and keeps ids and history', async () => {
    const name = `V4-${crypto.randomUUID()}`;
    const previous = new Dexie(name);
    previous.version(4).stores({ presets: '++id, name, isFavorite, createdAt, updatedAt, order', settings: 'key', history: '++id, editorId, timestamp' });
    await previous.table('presets').bulkAdd(legacy.presets);
    await previous.table('history').add({ text: 'keep', editorId: 'left', timestamp: 1 });
    previous.close();
    const current = new EditDatabase(name);
    try {
      await current.open();
      const items = await current.presets.toArray();
      expect(items.map(item => item.id)).toEqual([1, 2]);
      expect(applyPreset('foo', items[1].data)).toBe('[foo]');
      expect(await current.history.count()).toBe(1);
    } finally { await current.delete(); }
  });
});
