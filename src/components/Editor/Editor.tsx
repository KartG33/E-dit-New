import { useRef, useEffect, useLayoutEffect } from 'react';
import { ClipboardPaste, Copy, Redo2, ReplaceAll, Trash2, Undo2 } from 'lucide-react';
import { Clipboard } from '@capacitor/clipboard';
import { useSymbolAnalyzer } from '../../hooks/useSymbolAnalyzer';
import { useGlobalHotkeys } from '../../hooks/useGlobalHotkeys';
import type { EditorState } from '../../hooks/useEditor';
import { removeTokenFromText } from '../../lib/analyzer';

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
}: EditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stats = useSymbolAnalyzer(value);
  const lastAction = useRef<'UNDO' | 'REDO' | 'PASTE' | 'TYPE'>('TYPE');

  // Focus management
  useEffect(() => {
    if (isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

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
    } catch {
      reportClipboardError('Failed to paste text');
    }
  };

  const handleClear = () => {
    updateValue('', 0, 0, true);
  };

  const preserveEditorFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (document.activeElement === textareaRef.current) {
      event.preventDefault();
    }
  };

  useGlobalHotkeys({
    'Ctrl+Z': () => { if (isActive) handleUndo(); },
    'Ctrl+Shift+Z': () => { if (isActive) handleRedo(); },
    'Ctrl+Y': () => { if (isActive) handleRedo(); },
  }, isActive);

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
        <div className="editor-header-controls">
          <button
            type="button"
            onClick={onOpenQuickEdit}
            onPointerDown={preserveEditorFocus}
            disabled={!hydrated || value.length === 0}
            className="icon-button"
            title="Find, replace or remove exact text"
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
            title="Copy all text"
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
            title="Paste"
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
            title="Clear editor"
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
            title="Undo (Ctrl+Z)"
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
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

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
      />

      {stats.tokens && stats.tokens.length > 0 && (
        <div className="editor-footer">
          <div className="token-list">
            {stats.tokens.map(t => (
              <button
                type="button"
                key={t.token}
                onClick={() => updateValue(removeTokenFromText(value, t.token), undefined, undefined, true)}
                className="token-button"
                title={`Remove all ${t.token}`}
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
