import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

/** Shared focus containment and outside-click handling for floating dialogs. */
export function useDialog(onClose: () => void, open = true) {
  const dialogRef = useRef<HTMLElement>(null);
  const startedOutside = useRef(false);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')?.focus({ preventScroll: true });
    }
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(item => item.getClientRects().length > 0 && !item.closest('[inert]'));
      const first = items[0]; const last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, [open]);
  return {
    dialogRef,
    backdropProps: {
      onMouseDown: (event: MouseEvent<HTMLElement>) => { startedOutside.current = event.target === event.currentTarget; },
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (startedOutside.current && event.target === event.currentTarget) onClose();
        startedOutside.current = false;
      },
    },
  };
}
