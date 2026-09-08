import type { EditDatabase, Preset, PresetShortcut } from './db';
import { ACTION_DEFINITIONS, isBuiltinActionId } from './actions';
import { shortcutId, validatePresetShortcut } from './hotkeys';

export type ActionShortcuts = Record<string, PresetShortcut | null>;
const binding = (code: string, ctrl = true, alt = false): PresetShortcut => ({ code, ctrl, alt, shift: false, meta: false });
export const DEFAULT_SHORTCUTS: ActionShortcuts = {
  'editor.left': binding('Digit1', false, true), 'editor.right': binding('Digit2', false, true),
  'layout.toggle': binding('Backslash'), 'editor.undo': binding('KeyZ'),
  'editor.redo': binding('KeyY'), 'open.find': binding('KeyF'),
};
export function getActionShortcut(id: string, overrides: ActionShortcuts) {
  return (Object.hasOwn(overrides, id) ? overrides[id] : DEFAULT_SHORTCUTS[id]) ?? undefined;
}
export function validateActionShortcut(id: string, shortcut: PresetShortcut): string | null {
  if (DEFAULT_SHORTCUTS[id] && shortcutId(DEFAULT_SHORTCUTS[id]!) === shortcutId(shortcut)) return null;
  return validatePresetShortcut(shortcut);
}
export function isActionShortcuts(value: unknown): value is ActionShortcuts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, shortcut]) => {
    if (!isBuiltinActionId(id)) return false;
    if (shortcut === null) return true;
    if (!shortcut || typeof shortcut !== 'object' || Array.isArray(shortcut)) return false;
    const fields = ['code', 'ctrl', 'alt', 'shift', 'meta'];
    return Object.keys(shortcut).every(key => fields.includes(key)) && typeof shortcut.code === 'string'
      && ['ctrl', 'alt', 'shift', 'meta'].every(key => typeof shortcut[key] === 'boolean')
      && !validateActionShortcut(id, shortcut);
  });
}
export function shortcutConflict(id: string, shortcut: PresetShortcut, overrides: ActionShortcuts, presets: Preset[]) {
  const target = shortcutId(shortcut);
  for (const action of ACTION_DEFINITIONS) {
    const value = getActionShortcut(action.id, overrides);
    if (action.id !== id && value && shortcutId(value) === target) return `This shortcut is already assigned to “${action.label}”.`;
  }
  for (const preset of presets) {
    if (`preset:${preset.id}` !== id && preset.shortcut && shortcutId(preset.shortcut) === target) return `This shortcut is already assigned to “${preset.name}”.`;
  }
  return null;
}
export function validateAllShortcuts(overrides: ActionShortcuts, presets: Preset[]) {
  for (const action of ACTION_DEFINITIONS) {
    const value = getActionShortcut(action.id, overrides);
    if (!value) continue;
    const invalid = validateActionShortcut(action.id, value) || shortcutConflict(action.id, value, overrides, presets);
    if (invalid) return invalid;
  }
  return null;
}
export async function saveActionShortcut(database: EditDatabase, id: string, shortcut: PresetShortcut | null | undefined) {
  await database.transaction('rw', database.settings, database.presets, async () => {
    const overrides = { ...(await database.getSetting('actionShortcuts') ?? {}) };
    const presets = await database.presets.toArray();
    const presetId = id.startsWith('preset:') ? Number(id.slice(7)) : undefined;
    if (presetId !== undefined) {
      const preset = presets.find(item => item.id === presetId);
      if (!preset) throw new Error('This preset no longer exists.');
      if (shortcut) {
        const invalid = validatePresetShortcut(shortcut) || shortcutConflict(id, shortcut, overrides, presets);
        if (invalid) throw new Error(invalid);
      }
      await database.presets.update(presetId, { shortcut: shortcut ?? undefined, updatedAt: Date.now() });
    } else {
      if (!isBuiltinActionId(id)) throw new Error('Unknown action');
      if (shortcut === undefined) delete overrides[id]; else overrides[id] = shortcut;
      const invalid = validateAllShortcuts(overrides, presets);
      if (invalid) throw new Error(invalid);
      await database.setSetting('actionShortcuts', overrides);
    }
  });
}
