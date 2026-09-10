import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../apps/desktop/src/lib/db';
import { getActionShortcut, saveActionShortcut } from '../apps/desktop/src/lib/actionShortcuts';
import { parseDataFile } from '../apps/desktop/src/lib/data/import';

const custom = { code: 'KeyK', ctrl: true, alt: false, shift: true, meta: false };
beforeEach(async () => { await db.settings.clear(); await db.presets.clear(); });
describe('action shortcuts', () => {
  it('saves, clears and resets defaults', async () => {
    await saveActionShortcut(db, 'editor.undo', custom);
    expect(getActionShortcut('editor.undo', (await db.getSetting('actionShortcuts'))!)).toEqual(custom);
    await saveActionShortcut(db, 'editor.undo', null);
    expect(getActionShortcut('editor.undo', (await db.getSetting('actionShortcuts'))!)).toBeUndefined();
    await saveActionShortcut(db, 'editor.undo', undefined);
    expect(getActionShortcut('editor.undo', (await db.getSetting('actionShortcuts'))!)?.code).toBe('KeyZ');
  });
  it('rejects a preset collision without altering the existing binding', async () => {
    await db.presets.add({ name: 'Existing', data: { type: 'sequence', steps: [] }, shortcut: custom, isFavorite: false, createdAt: 1, updatedAt: 1 });
    await expect(saveActionShortcut(db, 'text.spaces', custom)).rejects.toThrow('Existing');
    expect(await db.getSetting('actionShortcuts')).toBeUndefined();
  });
  it('validates imported overrides and collisions before writing', () => {
    const file = { version: 3, timestamp: 1, presets: [], settings: [{ key: 'actionShortcuts', value: { 'text.spaces': custom, 'open.history': custom } }] };
    expect(() => parseDataFile(JSON.stringify(file))).toThrow('already assigned');
    file.settings[0].value = { 'text.spaces': custom } as typeof file.settings[0]['value'];
    expect(parseDataFile(JSON.stringify(file)).settings).toEqual(file.settings);
    expect(() => parseDataFile(JSON.stringify({ ...file, settings: [{ key: 'actionShortcuts', value: { constructor: custom } }] }))).toThrow('invalid');
  });
});
