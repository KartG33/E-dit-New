import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_IMPORTED } from '../lib/editorPersistence';

export type WorkspacePanel =
  | { type: 'history' | 'presets' | 'tags' | 'find' }
  | { type: 'settings'; view?: 'home' | 'keys' | 'data' | 'presets' }
  | { type: 'quickEdit'; editorId: 'left' | 'right' }
  | null;

export const getEditorElement = (id: 'left' | 'right') =>
  document.querySelector<HTMLTextAreaElement>(`textarea[data-editor-id="${id}"]`);

export function useWorkspacePanels(activeEditor: 'left' | 'right', desktop: boolean) {
  const [panel, setPanel] = useState<WorkspacePanel>(null);
  const position = useRef<{ id: 'left' | 'right'; start: number; end: number; top: number; left: number; editing: boolean } | null>(null);
  const pointerEditing = useRef({ at: 0, editing: false, id: activeEditor });
  const restoreFrame = useRef(0);
  useEffect(() => {
    const pointer = () => {
      if (!panel) pointerEditing.current = { at: performance.now(), editing: document.activeElement === getEditorElement(activeEditor), id: activeEditor };
    };
    window.addEventListener('pointerdown', pointer, true);
    return () => { window.removeEventListener('pointerdown', pointer, true); };
  }, [activeEditor, panel]);
  useEffect(() => () => cancelAnimationFrame(restoreFrame.current), []);
  useEffect(() => {
    const imported = () => { position.current = null; cancelAnimationFrame(restoreFrame.current); };
    window.addEventListener(DATA_IMPORTED, imported);
    return () => window.removeEventListener(DATA_IMPORTED, imported);
  }, []);
  const openPanel = useCallback((next: Exclude<WorkspacePanel, null>, targetEditor = activeEditor) => {
    cancelAnimationFrame(restoreFrame.current);
    if (!panel) {
      const editor = getEditorElement(targetEditor);
      if (editor) position.current = {
        id: targetEditor, start: editor.selectionStart, end: editor.selectionEnd,
        top: editor.scrollTop, left: editor.scrollLeft,
        editing: document.activeElement === editor || (performance.now() - pointerEditing.current.at < 500 && pointerEditing.current.editing && pointerEditing.current.id === targetEditor),
      };
    }
    setPanel(next);
  }, [activeEditor, panel]);
  const closePanel = useCallback((restore = true) => {
    setPanel(null);
    const saved = position.current;
    if (!restore || !saved) return;
    restoreFrame.current = requestAnimationFrame(() => {
      const editor = getEditorElement(saved.id);
      if (!editor || editor.disabled) return;
      if (desktop || saved.editing) editor.focus({ preventScroll: true });
      editor.setSelectionRange(saved.start, saved.end);
      editor.scrollTop = saved.top;
      editor.scrollLeft = saved.left;
    });
  }, [desktop]);
  return { panel, openPanel, closePanel };
}
