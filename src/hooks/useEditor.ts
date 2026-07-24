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
  hydrated: boolean;
}

type Action = 
  | { type: 'HYDRATE'; payload: EditorState }
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
    case 'UPDATE': {
      if (!action.addToHistory) {
        return { ...state, value: action.payload.value };
      }
      
      const currentHistory = state.history.slice(0, state.historyIndex + 1);
      
      // Prevent consecutive duplicates in history
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
      // Update cursor for latest state without creating undo step
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

  const pendingUpdates = useRef<Parameters<typeof updateValue>[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(state.value);
  valueRef.current = state.value;
  
  const hydratedRef = useRef(state.hydrated);
  hydratedRef.current = state.hydrated;

  const saveToDb = useCallback(async (text: string) => {
    try {
      const settingKey: 'editorLeftText' | 'editorRightText' = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
      await db.setSetting(settingKey, text);
      
      // Only push to Dexie history if it differs from the last Dexie record for this editor
      const lastRecord = await db.history.where('editorId').equals(editorId).reverse().sortBy('timestamp');
      if (lastRecord.length === 0 || lastRecord[0].text !== text) {
        await db.addHistory({ editorId, text, timestamp: Date.now() }, 50);
      }
    } catch {
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to save editor state' }));
    }
  }, [editorId]);

  const updateValue = useCallback((newValue: string, selectionStart: number = 0, selectionEnd: number = 0, addToHistory: boolean = true) => {
    if (!hydratedRef.current) {
      pendingUpdates.current.push([newValue, selectionStart, selectionEnd, addToHistory]);
      return;
    }
    
    dispatch({ type: 'UPDATE', payload: { value: newValue, selectionStart, selectionEnd }, addToHistory });
    
    if (addToHistory) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      debounceTimer.current = setTimeout(() => {
        saveToDb(newValue);
        debounceTimer.current = null;
      }, 2000); // Wait, I should make sure tests can override this. For now 2000 is fine if we use fake timers.
    }
  }, [saveToDb]);

  // Hydration from settings
  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      const settingKey: 'editorLeftText' | 'editorRightText' = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
      const text = await db.getSetting(settingKey) || '';
      if (!isMounted) return;
      
      dispatch({ type: 'HYDRATE', payload: { value: String(text), selectionStart: 0, selectionEnd: 0 } });
      
      // Flush any queued updates that happened before hydration
      if (pendingUpdates.current.length > 0) {
        pendingUpdates.current.forEach(args => {
          updateValue(...args);
        });
        pendingUpdates.current = [];
      }
    };
    loadState();
    return () => { isMounted = false; };
  }, [editorId, updateValue]);

  const onSelect = useCallback((selectionStart: number, selectionEnd: number) => {
    dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
  }, []);

  const undo = useCallback(() => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const newValue = state.history[newIndex].value;
      dispatch({ type: 'UNDO' });
      saveToDb(newValue);
    }
  }, [state, saveToDb]);
  
  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const newValue = state.history[newIndex].value;
      dispatch({ type: 'REDO' });
      saveToDb(newValue);
    }
  }, [state, saveToDb]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const currentState = state.history[state.historyIndex];

  // Cleanup on unmount: flush debounced save ONLY if pending
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        saveToDb(valueRef.current);
      }
    };
  }, [saveToDb]);

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
