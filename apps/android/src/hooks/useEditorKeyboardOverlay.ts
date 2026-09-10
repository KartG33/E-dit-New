import { useLayoutEffect, type RefObject } from 'react';
import { KEYBOARD_INSETS_EVENT, keyboardOcclusion } from '../lib/keyboardOverlay';

/** Keep the editor box fixed and reveal the caret by scrolling its content only. */
export function useEditorKeyboardOverlay(
  cardRef: RefObject<HTMLDivElement | null>,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  footerRef: RefObject<HTMLDivElement | null>,
  expanded: boolean, active: boolean, value: string,
) {
  useLayoutEffect(() => {
    const card = cardRef.current, editor = textareaRef.current, footer = footerRef.current;
    if (!card || !editor || !footer || !active) return;
    let frame = 0;
    const basePadding = 16;
    const update = () => {
      const keyboardTop = document.documentElement.clientHeight - keyboardOcclusion();
      const cardBox = card.getBoundingClientRect();
      footer.style.bottom = `${Math.max(0, cardBox.bottom - 1 - keyboardTop)}px`;
      const box = editor.getBoundingClientRect();
      const visibleBottom = Math.min(box.bottom, keyboardTop,
        expanded ? footer.getBoundingClientRect().top : box.bottom);
      editor.style.paddingBottom = `${basePadding + Math.max(0, box.bottom - visibleBottom)}px`;
      if (document.activeElement !== editor || visibleBottom <= box.top) return;
      const style = getComputedStyle(editor);
      const mirror = document.createElement('div');
      for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
        'lineHeight', 'textIndent', 'tabSize', 'wordBreak', 'overflowWrap', 'paddingLeft', 'paddingRight', 'paddingTop'] as const) {
        mirror.style[property] = style[property];
      }
      Object.assign(mirror.style, { position: 'fixed', left: '-10000px', top: '0',
        visibility: 'hidden', whiteSpace: 'pre-wrap', boxSizing: 'border-box', width: `${editor.clientWidth}px` });
      const caret = editor.selectionDirection === 'backward' ? editor.selectionStart : editor.selectionEnd;
      mirror.textContent = editor.value.slice(0, caret);
      const marker = document.createElement('span');
      marker.textContent = '\u200b';
      mirror.append(marker);
      document.body.append(mirror);
      const lineTop = marker.getBoundingClientRect().top - mirror.getBoundingClientRect().top;
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      mirror.remove();
      const caretTop = box.top + lineTop - editor.scrollTop;
      const bottom = visibleBottom - 8;
      if (caretTop + lineHeight > bottom) editor.scrollTop += caretTop + lineHeight - bottom;
      else if (caretTop < box.top + 8) editor.scrollTop -= box.top + 8 - caretTop;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener(KEYBOARD_INSETS_EVENT, schedule);
    window.addEventListener('resize', schedule);
    editor.addEventListener('input', schedule);
    editor.addEventListener('select', schedule);
    editor.addEventListener('focus', schedule);
    document.addEventListener('selectionchange', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(card); observer?.observe(footer);
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      window.removeEventListener(KEYBOARD_INSETS_EVENT, schedule);
      window.removeEventListener('resize', schedule);
      editor.removeEventListener('input', schedule);
      editor.removeEventListener('select', schedule);
      editor.removeEventListener('focus', schedule);
      document.removeEventListener('selectionchange', schedule);
    };
  }, [cardRef, textareaRef, footerRef, expanded, active, value]);
}
