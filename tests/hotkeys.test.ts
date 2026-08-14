import { describe, expect, it } from 'vitest';
import {
  formatShortcut,
  isModifierCode,
  isShortcutMatch,
  shortcutFromEvent,
  shortcutId,
  validatePresetShortcut,
} from '../src/lib/hotkeys';

describe('desktop shortcuts', () => {
  const shortcut = { code: 'KeyK', ctrl: true, shift: true, alt: false, meta: false };

  it('uses physical key codes and stable identifiers', () => {
    expect(shortcutFromEvent({
      code: 'KeyK', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false,
    })).toEqual(shortcut);
    expect(shortcutId(shortcut)).toBe('Ctrl+Shift+KeyK');
    expect(formatShortcut(shortcut)).toBe('Ctrl + Shift + K');
    expect(isModifierCode('ControlLeft')).toBe(true);
    expect(isModifierCode('KeyK')).toBe(false);
  });

  it('matches every modifier exactly', () => {
    expect(isShortcutMatch({
      code: 'KeyK', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false,
    }, shortcut)).toBe(true);
    expect(isShortcutMatch({
      code: 'KeyK', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false,
    }, shortcut)).toBe(false);
  });

  it('rejects modifier-only, unmodified, and reserved shortcuts', () => {
    expect(validatePresetShortcut({ code: 'ShiftLeft', ctrl: true, shift: true, alt: false, meta: false })).toBeTruthy();
    expect(validatePresetShortcut({ code: 'KeyK', ctrl: false, shift: true, alt: false, meta: false })).toBeTruthy();
    expect(validatePresetShortcut({ code: 'KeyC', ctrl: true, shift: false, alt: false, meta: false })).toContain('reserved');
    expect(validatePresetShortcut(shortcut)).toBeNull();
  });
});
