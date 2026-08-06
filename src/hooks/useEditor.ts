import { useReducer, useCallback, useRef, useEffect } from 'react';
import { db } from '../lib/db';

const MAX_UNDO_STACK = 100;
const AUTOSAVE_DELAY = 2000;

export interface EditorState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface ReducerState {
  value: string;
  undoStack: EditorState[];
  undoStackIndex: number;
  hydrated: boolean;
}

type Action = 
  | { type: 'HYDRATE'; payload: EditorState }
  | { type: 'HYDRATE_ERROR' }
  | { type: 'UPDATE'; payload: EditorState; addToUndoStack: boolean }
  | { type: 'SET_SELECTION'; payload: { selectionStart: number; selectionEnd: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const editorReducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'HYDRATE': {
      return {
        value: action.payload.value,
        undoStack: [action.payload],
        undoStackIndex: 0,
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
      if (!action.addToUndoStack) {
        return { ...state, value: action.payload.value };
      }
      
      const currentUndoStack = state.undoStack.slice(0, state.undoStackIndex + 1);
      
      // Prevent consecutive duplicates in the Undo Stack
      const prev = currentUndoStack[currentUndoStack.length - 1];
      if (prev && prev.value === action.payload.value) {
        return state;
      }
      
      const nextUndoStack = [...currentUndoStack, action.payload];
      
      if (nextUndoStack.length > MAX_UNDO_STACK) {
        nextUndoStack.shift();
      }
      
      return {
        ...state,
        value: action.payload.value,
        undoStack: nextUndoStack,
        undoStackIndex: nextUndoStack.length - 1,
      };
    }
    case 'SET_SELECTION': {
      const nextUndoStack = [...state.undoStack];
      nextUndoStack[state.undoStackIndex] = {
        ...nextUndoStack[state.undoStackIndex],
        selectionStart: action.payload.selectionStart,
        selectionEnd: action.payload.selectionEnd,
      };
      return { ...state, undoStack: nextUndoStack };
    }
    case 'UNDO': {
      if (state.undoStackIndex > 0) {
        const newIndex = state.undoStackIndex - 1;
        return { ...state, value: state.undoStack[newIndex].value, undoStackIndex: newIndex };
      }
      return state;
    }
    case 'REDO': {
      if (state.undoStackIndex < state.undoStack.length - 1) {
        const newIndex = state.undoStackIndex + 1;
        return { ...state, value: state.undoStack[newIndex].value, undoStackIndex: newIndex };
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
    undoStack: [{ value: '', selectionStart: 0, selectionEnd: 0 }],
    undoStackIndex: 0,
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

  const appendHistoryVersion = useCallback(async (text: string) => {
    try {
      await db.addHistory({ editorId, text, timestamp: Date.now() });
    } catch {
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to save history' }));
    }
  }, [editorId]);

  const flushPendingSave = useCallback(async () => {
    if (!debounceTimer.current) return;

    clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    const text = valueRef.current;
    await Promise.all([
      saveCurrentEditorText(text),
      appendHistoryVersion(text),
    ]);
  }, [saveCurrentEditorText, appendHistoryVersion]);

  const updateValue = useCallback((newValue: string, selectionStart: number = 0, selectionEnd: number = 0, addToUndoStack: boolean = true) => {
    if (!state.hydrated) {
      return; // Ignored while not hydrated
    }

    if (newValue === valueRef.current) {
      dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
      return;
    }
    
    dispatch({ type: 'UPDATE', payload: { value: newValue, selectionStart, selectionEnd }, addToUndoStack });
    
    if (addToUndoStack) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        void flushPendingSave();
      }, AUTOSAVE_DELAY);
    }
  }, [state.hydrated, flushPendingSave]);

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
    if (state.undoStackIndex > 0) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const newIndex = state.undoStackIndex - 1;
      const newValue = state.undoStack[newIndex].value;
      dispatch({ type: 'UNDO' });
      saveCurrentEditorText(newValue);
    }
  }, [state.undoStack, state.undoStackIndex, saveCurrentEditorText]);
  
  const redo = useCallback(() => {
    if (state.undoStackIndex < state.undoStack.length - 1) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const newIndex = state.undoStackIndex + 1;
      const newValue = state.undoStack[newIndex].value;
      dispatch({ type: 'REDO' });
      saveCurrentEditorText(newValue);
    }
  }, [state.undoStack, state.undoStackIndex, saveCurrentEditorText]);

  const canUndo = state.undoStackIndex > 0;
  const canRedo = state.undoStackIndex < state.undoStack.length - 1;
  const currentState = state.undoStack[state.undoStackIndex];

  // Cleanup on unmount: flush debounced save ONLY if pending
  useEffect(() => {
    return () => {
      void flushPendingSave();
    };
  }, [flushPendingSave]);

  return {
    value: state.value,
    currentState,
    hydrated: state.hydrated,
    updateValue,
    onSelect,
    undo,
    redo,
    flushPendingSave,
    canUndo,
    canRedo,
  };
};
