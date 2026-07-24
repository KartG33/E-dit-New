import { useEffect } from 'react';

type HotkeyHandler = (e: KeyboardEvent) => void;

interface Hotkeys {
  [keyCombo: string]: HotkeyHandler;
}

export const useGlobalHotkeys = (hotkeys: Hotkeys, active: boolean = true) => {
  useEffect(() => {
    if (!active) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input field (unless it has data-editor-id which is our main editor)
      const target = e.target as HTMLElement;
      if (
        target &&
        !target.hasAttribute('data-editor-id') &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      parts.push(e.key.toUpperCase());
      
      const keyCombo = parts.join('+');
      
      if (hotkeys[keyCombo]) {
        e.preventDefault();
        hotkeys[keyCombo](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [hotkeys, active]);
};
