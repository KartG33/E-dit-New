export const KEYBOARD_INSETS_EVENT = 'edit-keyboard-insets';
export interface KeyboardInsets { height: number; visible: boolean }

declare global {
  interface Window { __editKeyboardInsets?: KeyboardInsets }
}

export function keyboardOcclusion() {
  return Math.max(0, window.__editKeyboardInsets?.height ?? 0);
}

export function listenKeyboardVisibility(visible: boolean, listener: (event: { keyboardHeight: number }) => void) {
  const handle = () => {
    if (!!window.__editKeyboardInsets?.visible === visible) listener({ keyboardHeight: keyboardOcclusion() });
  };
  window.addEventListener(KEYBOARD_INSETS_EVENT, handle);
  handle();
  return Promise.resolve({ remove: async () => { window.removeEventListener(KEYBOARD_INSETS_EVENT, handle); } });
}
