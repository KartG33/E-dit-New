import { useRef, useEffect, useLayoutEffect, useImperativeHandle, type Ref } from 'react';
import { ClipboardPaste, Copy, CopyPlus, Search, Redo2, ReplaceAll, Trash2, Undo2 } from 'lucide-react';
import { Clipboard } from '@capacitor/clipboard';
import { useSymbolAnalyzer } from '../../hooks/useSymbolAnalyzer';
import { useGlobalHotkeys } from '../../hooks/useGlobalHotkeys';
import type { EditorState } from '../../hooks/useEditor';
import { removeTokenFromText } from '../../lib/analyzer';
import type { SaveStatus } from '../../lib/editorPersistence';
import { useActions } from '../Shortcuts/ActionContext';
import { notify } from '../../lib/notifications';
import { revealTextRange, type TextMatch } from '../../lib/textSearch';

export interface EditorActions { undo: () => void; redo: () => void; copy: () => Promise<void>; paste: () => Promise<void>; clear: () => void }

export interface EditorProps {
  id: 'left' | 'right';
  value: string;
  isActive: boolean;
  onFocus: () => void;
  updateValue: (val: string, selectionStart?: number, selectionEnd?: number, addToUndoStack?: boolean) => void;
  onSelect: (start: number, end: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentState: EditorState;
  hydrated: boolean;
  onOpenQuickEdit?: () => void;
  onOpenFind?: () => void;
  onCopyOther?: () => void;
  saveStatus?: SaveStatus;
  hotkeysEnabled?: boolean;
  actionsRef?: Ref<EditorActions>;
  highlightedMatch?: TextMatch;
  onClearHighlight?: () => void;
  focusOnActivate?: boolean;
}

export const Editor = ({
  id,
  value,
  currentState,
  updateValue,
  onSelect,
  undo,
  redo,
  canUndo,
  canRedo,
  isActive,
  onFocus,
  hydrated,
  onOpenQuickEdit,
  onOpenFind,
  onCopyOther,
  saveStatus,
  hotkeysEnabled = true,
  actionsRef,
  highlightedMatch,
  onClearHighlight,
  focusOnActivate = true,
}: EditorProps) => {
  const { title } = useActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const syncHighlight = () => {
    const editor = textareaRef.current; const layer = highlightRef.current;
    if (!editor || !layer) return;
    layer.style.width = `${editor.clientWidth}px`;
    layer.scrollTop = editor.scrollTop;
    layer.scrollLeft = editor.scrollLeft;
  };
  useLayoutEffect(() => {
    const editor = textareaRef.current;
    if (!editor) return;
    const reveal = () => {
      if (highlightedMatch) revealTextRange(editor, highlightedMatch);
      syncHighlight();
    };
    reveal();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reveal);
    observer.observe(editor);
    return () => observer.disconnect();
  }, [highlightedMatch, value]);
  const stats = useSymbolAnalyzer(value);
  const lastAction = useRef<'UNDO' | 'REDO' | 'PASTE' | 'TYPE'>('TYPE');

  // Focus management
  useEffect(() => {
    if (focusOnActivate && isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive, focusOnActivate]);

  // Restore selection after undo/redo
  useLayoutEffect(() => {
    if (lastAction.current === 'UNDO' || lastAction.current === 'REDO' || lastAction.current === 'PASTE') {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(currentState.selectionStart, currentState.selectionEnd);
      }
      lastAction.current = 'TYPE';
    }
  }, [value, currentState]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onClearHighlight?.();
    lastAction.current = 'TYPE';
    updateValue(
      e.target.value,
      e.target.selectionStart,
      e.target.selectionEnd,
      true
    );
  };

  const handleUndo = () => {
    lastAction.current = 'UNDO';
    undo();
  };

  const handleRedo = () => {
    lastAction.current = 'REDO';
    redo();
  };

  const reportClipboardError = (message: string) => {
    window.dispatchEvent(new CustomEvent('app-error', { detail: message }));
  };

  const handleCopy = async () => {
    try {
      await Clipboard.write({ string: value, label: 'E-dit editor text' });
      notify('Text copied');
    } catch {
      reportClipboardError('Failed to copy text');
    }
  };

  const handlePaste = async () => {
    try {
      const { value: clipboardValue } = await Clipboard.read();
      if (!clipboardValue) return;

      const selectionStart = textareaRef.current?.selectionStart ?? currentState.selectionStart;
      const selectionEnd = textareaRef.current?.selectionEnd ?? currentState.selectionEnd;
      const nextSelection = selectionStart + clipboardValue.length;
      const nextValue = `${value.slice(0, selectionStart)}${clipboardValue}${value.slice(selectionEnd)}`;

      lastAction.current = 'PASTE';
      updateValue(nextValue, nextSelection, nextSelection, true);
      notify('Text pasted');
    } catch {
      reportClipboardError('Failed to paste text');
    }
  };

  const handleClear = () => {
    updateValue('', 0, 0, true);
    notify(value ? 'Editor cleared. Undo is available.' : 'Editor is already empty');
  };
  useImperativeHandle(actionsRef, () => ({ undo: handleUndo, redo: handleRedo, copy: handleCopy, paste: handlePaste, clear: handleClear }));

  const preserveEditorFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (document.activeElement === textareaRef.current) {
      event.preventDefault();
    }
  };

  useGlobalHotkeys({
    'Ctrl+Z': () => { if (isActive) handleUndo(); },
    'Ctrl+Shift+Z': () => { if (isActive) handleRedo(); },
    'Ctrl+Y': () => { if (isActive) handleRedo(); },
  }, isActive && hotkeysEnabled);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    onSelect(target.selectionStart, target.selectionEnd);
  };

  return (
    <div className={`editor-card ${isActive ? 'is-active' : ''}`}>
      <div className="editor-header">
        <div className="editor-stats" data-testid="editor-stats">
          <span>{stats.characters}<span className="editor-stat-unit"> chars</span></span>
          <span aria-hidden="true">·</span>
          <span>{stats.lines}<span className="editor-stat-unit"> lines</span></span>
        </div>
        {saveStatus && <span className={`save-status is-${saveStatus}`} title="Editor save status" role="status">
          {({ saved: 'Saved', pending: 'Unsaved', saving: 'Saving…', error: 'Save failed' })[saveStatus]}
        </span>}
        <div className="editor-header-controls">
          {onOpenFind && <button type="button" className="icon-button" title={title('open.find', 'Find in text')} aria-label={`Search ${id} editor`} disabled={!hydrated} onPointerDown={preserveEditorFocus} onClick={onOpenFind}><Search size={18} /></button>}
          {onCopyOther && <button type="button" className="icon-button" title={title('editor.copyOther', `Copy all text to ${id === 'left' ? 'right' : 'left'} editor`)} aria-label={`Copy ${id} text to other editor`} disabled={!hydrated} onPointerDown={preserveEditorFocus} onClick={onCopyOther}><CopyPlus size={18} /></button>}
          <button
            type="button"
            onClick={onOpenQuickEdit}
            onPointerDown={preserveEditorFocus}
            disabled={!hydrated || value.length === 0}
            className="icon-button"
            title={title('open.replace', 'Find, replace or remove exact text')}
            aria-label={`Find and edit ${id} editor`}
          >
            <ReplaceAll size={18} />
          </button>
          <button
            type="button"
            onClick={() => { void handleCopy(); }}
            onPointerDown={preserveEditorFocus}
            disabled={!hydrated || value.length === 0}
            className="icon-button editor-mobile-action"
            title={title('editor.copy', 'Copy all text')}
            aria-label="Copy all text"
          >
            <Copy size={18} />
          </button>
          <button
            type="button"
            onClick={() => { void handlePaste(); }}
            onPointerDown={preserveEditorFocus}
            disabled={!hydrated}
            className="icon-button editor-mobile-action"
            title={title('editor.paste', 'Paste')}
            aria-label="Paste"
          >
            <ClipboardPaste size={18} />
          </button>
          <button
            type="button"
            onClick={handleClear}
            onPointerDown={preserveEditorFocus}
            disabled={!hydrated || value.length === 0}
            className="icon-button editor-mobile-action"
            title={title('editor.clear', 'Clear editor')}
            aria-label="Clear editor"
          >
            <Trash2 size={18} />
          </button>
          <button 
            type="button"
            onClick={handleUndo} 
            onPointerDown={preserveEditorFocus}
            disabled={!canUndo}
            className="icon-button"
            title={title('editor.undo', 'Undo')}
            aria-label="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button 
            type="button"
            onClick={handleRedo} 
            onPointerDown={preserveEditorFocus}
            disabled={!canRedo}
            className="icon-button"
            title={title('editor.redo', 'Redo')}
            aria-label="Redo"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      <div className="editor-input-shell">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        disabled={!hydrated}
        className="editor-textarea"
        placeholder={!hydrated ? "Loading..." : "Type or paste your text here..."}
        data-editor-id={id}
        aria-label={`${id} editor`}
        spellCheck={false}
        onSelect={handleSelect}
        onScroll={syncHighlight}
        onPointerDown={onClearHighlight}
      />
      {highlightedMatch && <div ref={highlightRef} className="editor-textarea editor-highlight-layer" aria-hidden="true">
        {value.slice(0, highlightedMatch.start)}<mark>{value.slice(highlightedMatch.start, highlightedMatch.end)}</mark>{value.slice(highlightedMatch.end)}{'\u200b'}
      </div>}
      </div>

      {stats.tokens && stats.tokens.length > 0 && (
        <div className="editor-footer">
          <div className="token-list">
            {stats.tokens.map(t => (
              <button
                type="button"
                key={t.token}
                onClick={() => updateValue(removeTokenFromText(value, t.token), undefined, undefined, true)}
                className="token-button"
                title={title(`symbol.remove:${t.token}`, `Remove all ${t.token}`)}
              >
                {t.token}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
