import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor, type EditorActions } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { SlidingDrawer } from './components/Drawer/SlidingDrawer';
import { SunoTagsPanel } from './components/SunoTags/SunoTagsPanel';
import { PresetManager } from './components/Presets/PresetManager';
import { SettingsModal } from './components/Settings/SettingsModal';
import { QuickTextEditModal } from './components/TextEdit/QuickTextEditModal';
import { StatusMessages } from './components/Status/StatusMessages';
import { TextSearchBar } from './components/TextEdit/TextSearchBar';
import { useEditor } from './hooks/useEditor';
import { useAndroidAppLifecycle } from './hooks/useAndroidAppLifecycle';
import { getEditorElement, useWorkspacePanels } from './hooks/useWorkspacePanels';
import { insertSunoTag, type SunoTagOccurrence } from './lib/commands/suno';
import type { TextMatch } from './lib/textSearch';
import { applyPreset } from './lib/presets/execute';
import { db } from './lib/db';
import { DATA_IMPORTED, flushEditors, isDataImporting } from './lib/editorPersistence';
import { notify } from './lib/notifications';
import { formatShortcut, isEditableTarget, isShortcutMatch } from './lib/hotkeys';
import { usePresets } from './hooks/usePresets';
import { useDesktopLayout } from './hooks/useDesktopLayout';

import { ActionContext } from './components/Shortcuts/ActionContext';
import { ACTION_DEFINITIONS } from './lib/actions';
import { COMMAND_REGISTRY, type CommandId } from './lib/commands/registry';
import { useActionShortcuts } from './hooks/useActionShortcuts';
import { getActionShortcut } from './lib/actionShortcuts';

const App = () => {
  const leftActions = useRef<EditorActions>(null);
  const rightActions = useRef<EditorActions>(null);
  const { overrides, loaded: shortcutsLoaded } = useActionShortcuts();
  const leftEditor = useEditor('left');
  const rightEditor = useEditor('right');
  const [activeEditor, setActiveEditor] = useState<'left' | 'right'>('left');
  const [dualMode, setDualMode] = useState(true);
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const [revealedMatch, setRevealedMatch] = useState<{ id: 'left' | 'right'; match: TextMatch } | null>(null);
  const { presets } = usePresets();
  const isDesktop = useDesktopLayout();
  const { panel, openPanel, closePanel } = useWorkspacePanels(activeEditor, isDesktop);
  const tagsOpen = panel?.type === 'tags';
  const editors = { left: leftEditor, right: rightEditor };

  useEffect(() => {
    let mounted = true;
    const load = () => {
      void Promise.all([db.getSetting('dualMode'), db.getSetting('activeEditor')])
        .then(([mode, editor]) => {
          if (!mounted) return;
          setDualMode(typeof mode === 'boolean' ? mode : true);
          if (editor === 'left' || editor === 'right') setActiveEditor(editor);
          setLayoutHydrated(true);
        }).catch(() => {
          if (mounted) setLayoutHydrated(true);
          notify('Failed to load layout settings', true);
        });
    };
    load();
    window.addEventListener(DATA_IMPORTED, load);
    return () => { mounted = false; window.removeEventListener(DATA_IMPORTED, load); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const update = () => {
      root.style.setProperty('--app-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty('--app-viewport-offset-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-offset-top');
    };
  }, []);

  useAndroidAppLifecycle({
    hasOpenWindow: panel !== null,
    closeOpenWindow: () => closePanel(panel?.type !== 'find'),
    flushPendingState: flushEditors,
  });

  const applyCommand = useCallback((command: (text: string) => string) => {
    const editor = activeEditor === 'left' ? leftEditor : rightEditor;
    if (!editor.hydrated || isDataImporting()) return;
    try {
      const result = command(editor.value);
      if (result === editor.value) { notify('No changes needed'); return; }
      editor.updateValue(result);
      notify('Text updated. Undo is available.');
    }
    catch (error) { notify(error instanceof Error ? error.message : 'Command failed', true); }
  }, [activeEditor, leftEditor, rightEditor]);

  const changeActiveEditor = useCallback((editor: 'left' | 'right') => {
    setActiveEditor(editor);
    if (layoutHydrated && !isDataImporting()) void db.setSetting('activeEditor', editor).catch(() => notify('Failed to save active editor', true));
  }, [layoutHydrated]);
  const changeDualMode = useCallback((mode: boolean) => {
    setDualMode(mode);
    if (layoutHydrated && !isDataImporting()) void db.setSetting('dualMode', mode).catch(() => notify('Failed to save layout', true));
  }, [layoutHydrated]);

  const insertTag = (tag: string) => {
    const editor = editors[activeEditor];
    const insertion = insertSunoTag(editor.value, editor.currentState.selectionStart, editor.currentState.selectionEnd, tag);
    editor.updateValue(insertion.text, insertion.selectionStart, insertion.selectionEnd, true);
  };

  const reveal = useCallback((match: TextMatch | null) => {
    setRevealedMatch(match ? { id: activeEditor, match } : null);
    if (!match) return;
    const select = activeEditor === 'left' ? leftEditor.onSelect : rightEditor.onSelect;
    select(match.start, match.end);
  }, [activeEditor, leftEditor.onSelect, rightEditor.onSelect]);
  const navigateTag = (tag: SunoTagOccurrence) => {
    if (editors[activeEditor].value.slice(tag.start, tag.end) !== tag.raw) return;
    if (!isDesktop) closePanel(false);
    requestAnimationFrame(() => {
      reveal(tag);
      if (isDesktop) getEditorElement(activeEditor)?.focus({ preventScroll: true });
    });
  };
  const copyOther = (sourceId: 'left' | 'right') => {
    const targetId = sourceId === 'left' ? 'right' : 'left';
    const source = editors[sourceId]; const target = editors[targetId];
    if (!source.hydrated || !target.hydrated || isDataImporting()) return;
    if (source.value === target.value) { notify('Both editors already contain the same text'); return; }
    target.updateValue(source.value, 0, 0, true);
    notify(`Text copied to ${targetId} editor. Undo is available there.`);
  };

  const runAction = (id: string) => {
    if (isDataImporting()) return;
    if (Object.hasOwn(COMMAND_REGISTRY, id)) { applyCommand(COMMAND_REGISTRY[id as CommandId]); return; }
    if (id.startsWith('preset:')) {
      const preset = presets.find(item => `preset:${item.id}` === id);
      if (preset) applyCommand(text => applyPreset(text, preset.data));
      return;
    }
    if (id === 'editor.left' || id === 'editor.right') {
      const target = id === 'editor.left' ? 'left' : 'right';
      changeActiveEditor(target);
      requestAnimationFrame(() => getEditorElement(target)?.focus({ preventScroll: true }));
      return;
    }
    if (id === 'layout.toggle') { changeDualMode(!dualMode); return; }
    if (id.startsWith('tab.')) { window.dispatchEvent(new CustomEvent('app-select-tab', { detail: id.slice(4) })); return; }
    switch (id) {
      case 'open.history': openPanel({ type: 'history' }); return;
      case 'open.presets': openPanel({ type: 'presets' }); return;
      case 'open.settings': openPanel({ type: 'settings' }); return;
      case 'open.keys': openPanel({ type: 'settings', view: 'keys' }); return;
      case 'open.data': openPanel({ type: 'settings', view: 'data' }); return;
      case 'open.tags': if (tagsOpen) closePanel(); else openPanel({ type: 'tags' }); return;
      case 'open.find': openPanel({ type: 'find' }); return;
      case 'open.replace': openPanel({ type: 'quickEdit', editorId: activeEditor }); return;
      case 'editor.copyOther': copyOther(activeEditor); return;
    }
    if (!editors[activeEditor].hydrated) return;
    const handlers = activeEditor === 'left' ? leftActions.current : rightActions.current;
    const command = id.slice(7);
    if (handlers && ['undo', 'redo', 'copy', 'paste', 'clear'].includes(command)) void handlers[command as keyof EditorActions]();
  };
  useEffect(() => {
    if (!shortcutsLoaded) return;
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.getModifierState('AltGraph') || isDataImporting()
        || document.querySelector('[data-recording-shortcut="true"]')) return;
      if (event.key === 'Escape' && panel?.type === 'find') {
        event.preventDefault(); closePanel(false); setRevealedMatch(null);
        if (isDesktop) getEditorElement(activeEditor)?.focus({ preventScroll: true });
        return;
      }
      if (panel && panel.type !== 'find' && panel.type !== 'tags') return;
      const editorTarget = event.target instanceof HTMLElement && event.target.hasAttribute('data-editor-id');
      if (isEditableTarget(event.target) && !editorTarget) return;
      const action = ACTION_DEFINITIONS.find(item => {
        const shortcut = getActionShortcut(item.id, overrides);
        return shortcut && isShortcutMatch(event, shortcut);
      });
      const preset = presets.find(item => item.shortcut && isShortcutMatch(event, item.shortcut));
      let id = action?.id ?? (preset ? `preset:${preset.id}` : undefined);
      if (!Object.hasOwn(overrides, 'editor.redo') && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && event.code === 'KeyZ') id = 'editor.redo';
      if (!id) return;
      event.preventDefault();
      if (!event.repeat) runAction(id);
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  });
  const actionTitle = (id: string, label: string) => {
    const shortcut = getActionShortcut(id, overrides);
    return shortcut ? `${label} (${formatShortcut(shortcut)})` : label;
  };

  return <ActionContext.Provider value={{ title: actionTitle, run: runAction }}><div className="app-shell">
    <StatusMessages />
    <CommandPanel
      applyCommand={applyCommand} activeEditor={activeEditor} onActiveEditorChange={changeActiveEditor}
      tagsOpen={tagsOpen} onTagsOpenChange={open => { if (open) openPanel({ type: 'tags' }); else if (tagsOpen) closePanel(); }}
      onOpenHistory={() => openPanel({ type: 'history' })} onOpenPresets={() => openPanel({ type: 'presets' })}
      dualMode={dualMode} onDualModeChange={changeDualMode} onOpenSettings={() => openPanel({ type: 'settings' })}
    />
    {panel?.type === 'find' && <TextSearchBar editorId={activeEditor} text={editors[activeEditor].value} onReveal={reveal} onClose={() => {
      closePanel(false);
      setRevealedMatch(null);
      if (isDesktop) getEditorElement(activeEditor)?.focus({ preventScroll: true });
    }} />}
    <main className={`app-main ${dualMode ? 'is-dual-mode' : 'is-single-mode'}`}>
      {(['left', 'right'] as const).map(id => {
        const editor = editors[id];
        const opposite = id === 'left' ? 'right' : 'left';
        return <div key={id} className={`app-editor-pane ${
          (!tagsOpen && activeEditor === id) || (tagsOpen && activeEditor === opposite) ? 'is-mobile-visible' : ''
        } ${!dualMode && !tagsOpen && activeEditor !== id ? 'is-single-hidden' : ''}`}>
          <Editor id={id} {...editor} isActive={activeEditor === id} hotkeysEnabled={false} actionsRef={id === 'left' ? leftActions : rightActions}
            focusOnActivate={isDesktop && (!panel || panel.type === 'tags')}
            highlightedMatch={revealedMatch?.id === id ? revealedMatch.match : undefined}
            onClearHighlight={() => setRevealedMatch(null)}
            onFocus={() => changeActiveEditor(id)}
            onOpenFind={() => { changeActiveEditor(id); openPanel({ type: 'find' }, id); }}
            onCopyOther={() => copyOther(id)}
            onOpenQuickEdit={() => { changeActiveEditor(id); openPanel({ type: 'quickEdit', editorId: id }, id); }}
          />
          {tagsOpen && activeEditor === opposite && <SunoTagsPanel
            editorKey={opposite} editorText={editors[opposite].value} onInsert={insertTag}
            onChangeText={applyCommand} onClose={() => closePanel()} onNavigate={navigateTag}
          />}
        </div>;
      })}
    </main>
    <SlidingDrawer isOpen={panel?.type === 'history'} onClose={() => closePanel()}
      applyHistoryVersion={text => {
        if (text === editors[activeEditor].value) { notify('This version is already in the editor'); return; }
        editors[activeEditor].updateValue(text); notify('History version restored. Undo is available.');
      }} />
    {panel?.type === 'presets' && <PresetManager onClose={() => closePanel()} />}
    {panel?.type === 'settings' && <SettingsModal initialView={panel.view} presets={presets} onClose={() => closePanel()} />}
    {panel?.type === 'quickEdit' && <QuickTextEditModal
      editorId={panel.editorId} value={editors[panel.editorId].value}
      onApply={value => editors[panel.editorId].updateValue(value, value.length, value.length, true)}
      onClose={() => closePanel()}
    />}
  </div></ActionContext.Provider>;
};
export default App;
