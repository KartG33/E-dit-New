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
    <div className={`flex flex-col h-full bg-white dark:bg-zinc-900 border ${isActive ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20' : 'border-zinc-300 dark:border-zinc-700'} rounded-lg overflow-hidden transition-all duration-200`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize mr-2">{id} Editor</span>
          <button 
            onClick={handleUndo} 
            disabled={!canUndo}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={!canRedo}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
        className="flex-1 w-full p-4 bg-transparent outline-none resize-none text-zinc-800 dark:text-zinc-200 disabled:opacity-50 font-mono text-sm leading-relaxed"
        placeholder={!hydrated ? "Loading..." : "Type or paste your text here..."}
        data-editor-id={id}
        spellCheck={false}
        onSelect={handleSelect}
      />

      <div className="flex flex-col bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
        {stats.tokens && stats.tokens.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700">
            {stats.tokens.map(t => (
              <button
                key={t.token}
                onClick={() => updateValue(removeTokenFromText(value, t.token), undefined, undefined, true)}
                className="text-[10px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 rounded transition-colors text-zinc-600 dark:text-zinc-300"
                title={`Remove all ${t.token}`}
              >
                {t.token}: {t.count}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          <div className="flex gap-3">
            <span>{stats.characters} chars</span>
            <span>{stats.charactersWithoutSpaces} chars (no space)</span>
          </div>
          <div className="flex gap-3">
            <span>{stats.words} words</span>
            <span>{stats.lines} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
};
