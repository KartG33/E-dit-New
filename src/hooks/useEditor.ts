import { useReducer, useCallback, useRef, useEffect } from 'react';
import { db } from '../lib/db';

const MAX_HISTORY = 100;
const AUTOSAVE_DELAY = 2000;

export interface EditorState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface ReducerState {
  value: string;
  history: EditorState[];
  historyIndex: number;
  hydrated: boolean;
}

type Action = 
  | { type: 'HYDRATE'; payload: EditorState }
  | { type: 'HYDRATE_ERROR' }
  | { type: 'UPDATE'; payload: EditorState; addToHistory: boolean }
  | { type: 'SET_SELECTION'; payload: { selectionStart: number; selectionEnd: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const editorReducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'HYDRATE': {
      return {
        value: action.payload.value,
        history: [action.payload],
        historyIndex: 0,
        hydrated: true,
      };
    }
    case 'HYDRATE_ERROR': {
      return {
        ...state,
        hydrated: true,
      };
    }
    case 'UPDATE': {
      if (!action.addToHistory) {
        return { ...state, value: action.payload.value };
      }
      
      const currentHistory = state.history.slice(0, state.historyIndex + 1);
      
      // Prevent consecutive duplicates in history stack
      const prev = currentHistory[currentHistory.length - 1];
      if (prev && prev.value === action.payload.value) {
        return state;
      }
      
      const nextHistory = [...currentHistory, action.payload];
      
      if (nextHistory.length > MAX_HISTORY) {
        nextHistory.shift();
      }
      
      return {
        ...state,
        value: action.payload.value,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    }
    case 'SET_SELECTION': {
      const newHistory = [...state.history];
      newHistory[state.historyIndex] = {
        ...newHistory[state.historyIndex],
        selectionStart: action.payload.selectionStart,
        selectionEnd: action.payload.selectionEnd,
      };
      return { ...state, history: newHistory };
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

export const useEditor = (editorId: 'left' | 'right') => {
  const [state, dispatch] = useReducer(editorReducer, {
    value: '',
    history: [{ value: '', selectionStart: 0, selectionEnd: 0 }],
    historyIndex: 0,
    hydrated: false,
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(state.value);
  valueRef.current = state.value;

  const saveCurrentEditorText = useCallback(async (text: string) => {
    try {
      const settingKey: 'editorLeftText' | 'editorRightText' = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
      await db.setSetting(settingKey, text);
    } catch {
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to save editor state' }));
    }
  }, [editorId]);

  const appendHistorySnapshot = useCallback(async (text: string) => {
    try {
      await db.transaction('rw', db.history, async () => {
        const records = await db.history
          .where('editorId')
          .equals(editorId)
          .sortBy('timestamp');
        const lastRecord = records[records.length - 1];
        if (!lastRecord || lastRecord.text !== text) {
          await db.history.add({ editorId, text, timestamp: Date.now() });
          if (records.length + 1 > 50) {
            const oldest = records.slice(0, records.length + 1 - 50).map(r => r.id!);
            await db.history.bulkDelete(oldest);
          }
        }
      });
    } catch {
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to save history' }));
    }
  }, [editorId]);

  const updateValue = useCallback((newValue: string, selectionStart: number = 0, selectionEnd: number = 0, addToHistory: boolean = true) => {
    if (!state.hydrated) {
      return; // Ignored while not hydrated
    }

    if (newValue === valueRef.current) {
      dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
      return;
    }
    
    dispatch({ type: 'UPDATE', payload: { value: newValue, selectionStart, selectionEnd }, addToHistory });
    
    if (addToHistory) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        saveCurrentEditorText(newValue);
        appendHistorySnapshot(newValue);
        debounceTimer.current = null;
      }, AUTOSAVE_DELAY);
    }
  }, [state.hydrated, saveCurrentEditorText, appendHistorySnapshot]);

  // Hydration from settings
  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const settingKey: 'editorLeftText' | 'editorRightText' = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
        const text = (await db.getSetting(settingKey)) || '';
        if (!isMounted) return;
        dispatch({ type: 'HYDRATE', payload: { value: String(text), selectionStart: 0, selectionEnd: 0 } });
      } catch {
        if (!isMounted) return;
        window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to load editor state' }));
        dispatch({ type: 'HYDRATE_ERROR' });
      }
    };
    loadState();
    return () => { isMounted = false; };
  }, [editorId]);

  const onSelect = useCallback((selectionStart: number, selectionEnd: number) => {
    dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
  }, []);

  const undo = useCallback(() => {
    if (state.historyIndex > 0) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const newIndex = state.historyIndex - 1;
      const newValue = state.history[newIndex].value;
      dispatch({ type: 'UNDO' });
      saveCurrentEditorText(newValue);
    }
  }, [state.history, state.historyIndex, saveCurrentEditorText]);
  
  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const newIndex = state.historyIndex + 1;
      const newValue = state.history[newIndex].value;
      dispatch({ type: 'REDO' });
      saveCurrentEditorText(newValue);
    }
  }, [state.history, state.historyIndex, saveCurrentEditorText]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const currentState = state.history[state.historyIndex];

  // Cleanup on unmount: flush debounced save ONLY if pending
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        saveCurrentEditorText(valueRef.current);
        appendHistorySnapshot(valueRef.current);
      }
    };
  }, [saveCurrentEditorText, appendHistorySnapshot]);

  return {
    value: state.value,
    currentState,
    hydrated: state.hydrated,
    updateValue,
    onSelect,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
