import { useReducer, useCallback, useRef, useEffect } from 'react';
import { db } from '../lib/db';

const MAX_HISTORY = 100;

export interface EditorState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface ReducerState {
  value: string;
  history: EditorState[];
  historyIndex: number;
}

type Action = 
  | { type: 'UPDATE'; payload: EditorState; addToHistory: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const editorReducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'UPDATE': {
      if (!action.addToHistory) {
        return { ...state, value: action.payload.value };
      }
      
      const currentHistory = state.history.slice(0, state.historyIndex + 1);
      const nextHistory = [...currentHistory, action.payload];
      
      if (nextHistory.length > MAX_HISTORY) {
        nextHistory.shift();
      }
      
      return {
        value: action.payload.value,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    }
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return { ...state, value: state.history[newIndex].value, historyIndex: newIndex };
      }
      return state;
    }
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return { ...state, value: state.history[newIndex].value, historyIndex: newIndex };
      }
      return state;
    }
    default:
      return state;
  }
};

export const useEditor = (editorId: 'left' | 'right' | 'main') => {
  const [state, dispatch] = useReducer(editorReducer, {
    value: '',
    history: [{ value: '', selectionStart: 0, selectionEnd: 0 }],
    historyIndex: 0,
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(state.value);
  valueRef.current = state.value;

  const saveToDb = useCallback((text: string) => {
    db.addHistory({ editorId, text, timestamp: Date.now() }, 50).catch(console.error);
  }, [editorId]);

  const updateValue = useCallback((newValue: string, selectionStart: number = 0, selectionEnd: number = 0, addToHistory: boolean = true) => {
    dispatch({ type: 'UPDATE', payload: { value: newValue, selectionStart, selectionEnd }, addToHistory });
    
    if (addToHistory) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => saveToDb(newValue), 2000);
    }
  }, [saveToDb]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const currentState = state.history[state.historyIndex];

  // Cleanup on unmount: flush debounced save
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        saveToDb(valueRef.current);
      }
    };
  }, [saveToDb]);

  return {
    value: state.value,
    currentState,
    updateValue,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
