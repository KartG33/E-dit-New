import { useRef, useEffect } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useSymbolAnalyzer } from '../../hooks/useSymbolAnalyzer';
import { useGlobalHotkeys } from '../../hooks/useGlobalHotkeys';
import type { EditorState } from '../../hooks/useEditor';

export interface EditorProps {
  id: 'left' | 'right' | 'main';
  value: string;
  currentState: EditorState;
  updateValue: (v: string, start?: number, end?: number, history?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isActive: boolean;
  onFocus: () => void;
}

export const Editor = ({
  id,
  value,
  currentState,
  updateValue,
  undo,
  redo,
  canUndo,
  canRedo,
  isActive,
  onFocus
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

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-zinc-900 border ${isActive ? 'border-blue-500' : 'border-zinc-300 dark:border-zinc-700'} rounded-lg shadow-sm overflow-hidden transition-colors`}>
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
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
        <div className="flex gap-4">
          <span title="Characters">{stats.characters} chars</span>
          <span title="Characters without spaces">{stats.charactersWithoutSpaces} no spaces</span>
          <span title="Words">{stats.words} words</span>
          <span title="Lines">{stats.lines} lines</span>
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        className="flex-1 w-full p-4 resize-none outline-none bg-transparent text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono text-sm leading-relaxed"
        placeholder="Type or paste text here..."
        spellCheck={false}
      />
    </div>
  );
};
