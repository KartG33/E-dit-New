import { useRef, useEffect } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
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
  hydrated
}: EditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stats = useSymbolAnalyzer(value);
  const lastAction = useRef<'UNDO' | 'REDO' | 'TYPE'>('TYPE');

  // Focus management
  useEffect(() => {
    if (isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  // Restore selection after undo/redo
  useEffect(() => {
    if (lastAction.current === 'UNDO' || lastAction.current === 'REDO') {
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
        <div className="editor-header-group">
          <span className="editor-title">{id} Editor</span>
          <button 
            onClick={handleUndo} 
            disabled={!canUndo}
            className="icon-button"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={!canRedo}
            className="icon-button"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
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

      <div className="editor-footer">
        {stats.tokens && stats.tokens.length > 0 && (
          <div className="token-list">
            {stats.tokens.map(t => (
              <button
                key={t.token}
                onClick={() => updateValue(removeTokenFromText(value, t.token), undefined, undefined, true)}
                className="token-button"
                title={`Remove all ${t.token}`}
              >
                {t.token}: {t.count}
              </button>
            ))}
          </div>
        )}
        <div className="editor-stats" data-testid="editor-stats">
          <div className="editor-stats-group">
            <span>{stats.characters} chars</span>
            <span>{stats.charactersWithoutSpaces} chars (no space)</span>
          </div>
          <div className="editor-stats-group">
            <span>{stats.words} words</span>
            <span>{stats.lines} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
};
