import { useReducer, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { db } from '../lib/db';
import { DATA_IMPORTED, EditorPersistence, isDataImporting } from '../lib/editorPersistence';

const MAX_UNDO_STACK = 100;

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
  | { type: 'LOADING' }
  | { type: 'HYDRATE'; payload: EditorState }
  | { type: 'HYDRATE_ERROR' }
  | { type: 'UPDATE'; payload: EditorState; addToUndoStack: boolean }
  | { type: 'SET_SELECTION'; payload: { selectionStart: number; selectionEnd: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const editorReducer = (state: ReducerState, action: Action): ReducerState => {
  switch (action.type) {
    case 'LOADING': return { ...state, hydrated: false };
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

  const persistence = useMemo(() => new EditorPersistence(editorId), [editorId]);
  const [saveStatus, setSaveStatus] = useState(persistence.status);
  const [importing, setImporting] = useState(isDataImporting());
  const valueRef = useRef(state.value);
  const hydratingRef = useRef(true);
  valueRef.current = state.value;
  const flushPendingSave = useCallback(() => persistence.flush(), [persistence]);

  const updateValue = useCallback((newValue: string, selectionStart: number = 0, selectionEnd: number = 0, addToUndoStack: boolean = true) => {
    if (!state.hydrated || hydratingRef.current || isDataImporting()) {
      return; // Ignored while not hydrated
    }

    if (newValue === valueRef.current) {
      dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
      return;
    }
    
    valueRef.current = newValue;
    dispatch({ type: 'UPDATE', payload: { value: newValue, selectionStart, selectionEnd }, addToUndoStack });
    
    if (addToUndoStack) {
      persistence.update(newValue);
    }
  }, [state.hydrated, persistence]);

  // Hydration from settings
  useEffect(() => {
    let isMounted = true;
    let generation = 0;
    const loadState = async () => {
      const currentGeneration = ++generation;
      hydratingRef.current = true;
      dispatch({ type: 'LOADING' });
      try {
        const settingKey: 'editorLeftText' | 'editorRightText' = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
        const saved = (await db.getSetting(settingKey)) || '';
        if (!isMounted || generation !== currentGeneration) return;
        const text = persistence.recover(String(saved));
        valueRef.current = text;
        hydratingRef.current = false;
        dispatch({ type: 'HYDRATE', payload: { value: String(text), selectionStart: 0, selectionEnd: 0 } });
      } catch {
        if (!isMounted || generation !== currentGeneration) return;
        hydratingRef.current = false;
        window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to load editor state' }));
        dispatch({ type: 'HYDRATE_ERROR' });
      }
    };
    void loadState();
    window.addEventListener(DATA_IMPORTED, loadState);
    return () => { isMounted = false; window.removeEventListener(DATA_IMPORTED, loadState); };
  }, [editorId, persistence]);

  const onSelect = useCallback((selectionStart: number, selectionEnd: number) => {
    dispatch({ type: 'SET_SELECTION', payload: { selectionStart, selectionEnd } });
  }, []);

  const undo = useCallback(() => {
    if (state.undoStackIndex > 0 && !hydratingRef.current && !isDataImporting()) {
      const newIndex = state.undoStackIndex - 1;
      const newValue = state.undoStack[newIndex].value;
      dispatch({ type: 'UNDO' });
      valueRef.current = newValue;
      persistence.update(newValue, false);
      void persistence.flush().catch(() => undefined);
    }
  }, [state.undoStack, state.undoStackIndex, persistence]);
  
  const redo = useCallback(() => {
    if (state.undoStackIndex < state.undoStack.length - 1 && !hydratingRef.current && !isDataImporting()) {
      const newIndex = state.undoStackIndex + 1;
      const newValue = state.undoStack[newIndex].value;
      dispatch({ type: 'REDO' });
      valueRef.current = newValue;
      persistence.update(newValue, false);
      void persistence.flush().catch(() => undefined);
    }
  }, [state.undoStack, state.undoStackIndex, persistence]);

  const canUndo = state.undoStackIndex > 0;
  const canRedo = state.undoStackIndex < state.undoStack.length - 1;
  const currentState = state.undoStack[state.undoStackIndex];

  // Cleanup on unmount: flush debounced save ONLY if pending
  useEffect(() => {
    const unregister = persistence.register();
    const unsubscribe = persistence.subscribe(setSaveStatus);
    const busy = () => setImporting(isDataImporting());
    const save = () => { void persistence.flush().catch(() => undefined); };
    const visibility = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('app-data-busy', busy);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      unregister();
      unsubscribe();
      window.removeEventListener('app-data-busy', busy);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', visibility);
      save();
    };
  }, [persistence]);

  return {
    value: state.value,
    currentState,
    hydrated: state.hydrated && !importing,
    saveStatus,
    updateValue,
    onSelect,
    undo,
    redo,
    flushPendingSave,
    canUndo,
    canRedo,
  };
};
