export interface ShortcutBinding {
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

const MODIFIER_CODES = new Set([
  'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
]);

export const isModifierCode = (code: string): boolean => MODIFIER_CODES.has(code);

const RESERVED_SHORTCUTS = new Set([
  'Ctrl+KeyA', 'Ctrl+KeyC', 'Ctrl+KeyF', 'Ctrl+KeyL', 'Ctrl+KeyN',
  'Ctrl+KeyO', 'Ctrl+KeyP', 'Ctrl+KeyR', 'Ctrl+KeyS', 'Ctrl+KeyT',
  'Ctrl+KeyU', 'Ctrl+KeyV', 'Ctrl+KeyW', 'Ctrl+KeyX', 'Ctrl+KeyY', 'Ctrl+KeyZ',
  'Ctrl+Shift+KeyC', 'Ctrl+Shift+KeyI', 'Ctrl+Shift+KeyJ',
  'Ctrl+Shift+KeyZ', 'Ctrl+Backslash', 'Alt+Digit1', 'Alt+Digit2',
  'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Alt+ArrowLeft', 'Alt+ArrowRight', 'Alt+Home',
  'Alt+F4', 'Alt+Tab',
]);

export const shortcutFromEvent = (event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>): ShortcutBinding => ({
  code: event.code,
  ctrl: event.ctrlKey,
  shift: event.shiftKey,
  alt: event.altKey,
  meta: event.metaKey,
});

export const shortcutId = (shortcut: ShortcutBinding): string => [
  shortcut.ctrl ? 'Ctrl' : '',
  shortcut.alt ? 'Alt' : '',
  shortcut.shift ? 'Shift' : '',
  shortcut.meta ? 'Meta' : '',
  shortcut.code,
].filter(Boolean).join('+');

const displayCode = (code: string): string => {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const names: Record<string, string> = {
    Backslash: '\\', BracketLeft: '[', BracketRight: ']',
    Comma: ',', Period: '.', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=',
    Slash: '/', Backquote: '`', Space: 'Space',
  };
  return names[code] ?? code;
};

export const formatShortcut = (shortcut: ShortcutBinding): string => [
  shortcut.ctrl ? 'Ctrl' : '',
  shortcut.alt ? 'Alt' : '',
  shortcut.shift ? 'Shift' : '',
  shortcut.meta ? 'Win' : '',
  displayCode(shortcut.code),
].filter(Boolean).join(' + ');

export const isShortcutMatch = (
  event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>,
  shortcut: ShortcutBinding,
): boolean => event.code === shortcut.code
  && event.ctrlKey === shortcut.ctrl
  && event.shiftKey === shortcut.shift
  && event.altKey === shortcut.alt
  && event.metaKey === shortcut.meta;

export const validatePresetShortcut = (shortcut: ShortcutBinding): string | null => {
  if (!shortcut.code || isModifierCode(shortcut.code)) {
    return 'Press a letter, number, symbol, or function key together with a modifier.';
  }
  if (shortcut.meta) {
    return 'Windows-key shortcuts are reserved by the operating system.';
  }
  if (!shortcut.ctrl && !shortcut.alt) {
    return 'Use Ctrl or Alt together with another key.';
  }
  if (RESERVED_SHORTCUTS.has(shortcutId(shortcut))) {
    return 'This shortcut is reserved by the editor, browser, or operating system.';
  }
  return null;
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const contentEditable = target.isContentEditable
    || target.getAttribute('contenteditable') === 'true'
    || target.getAttribute('contenteditable') === '';
  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || contentEditable;
};
