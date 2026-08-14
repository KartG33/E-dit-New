import { useCallback, useEffect, useState } from 'react';
import { Editor } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { SlidingDrawer } from './components/Drawer/SlidingDrawer';
import { SunoTagsPanel } from './components/SunoTags/SunoTagsPanel';
import { PresetManager } from './components/Presets/PresetManager';
import { ShortcutHelp } from './components/Shortcuts/ShortcutHelp';
import type { DrawerTab } from './components/Drawer/SlidingDrawer';
import { useEditor } from './hooks/useEditor';
import { useAndroidAppLifecycle } from './hooks/useAndroidAppLifecycle';
import { insertSunoTag } from './lib/commands/suno';
import { applyPreset } from './lib/presets/execute';
import { db } from './lib/db';
import { isEditableTarget, isShortcutMatch } from './lib/hotkeys';
import { usePresets } from './hooks/usePresets';
import { useDesktopLayout } from './hooks/useDesktopLayout';

const App = () => {
  const leftEditor = useEditor('left');
  const rightEditor = useEditor('right');
  const [activeEditor, setActiveEditor] = useState<'left' | 'right'>('left');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [dualMode, setDualMode] = useState(true);
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const { presets } = usePresets();
  const isDesktop = useDesktopLayout();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('history');

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      db.getSetting('dualMode'),
      db.getSetting('activeEditor'),
    ]).then(([savedDualMode, savedActiveEditor]) => {
      if (!mounted) return;
      if (typeof savedDualMode === 'boolean') setDualMode(savedDualMode);
      if (savedActiveEditor === 'left' || savedActiveEditor === 'right') {
        setActiveEditor(savedActiveEditor);
      }
      setLayoutHydrated(true);
    }).catch(() => {
      if (!mounted) return;
      setLayoutHydrated(true);
      window.dispatchEvent(new CustomEvent('app-error', { detail: 'Failed to load layout settings' }));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const updateViewportSize = () => {
      root.style.setProperty(
        '--app-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
      root.style.setProperty(
        '--app-viewport-offset-top',
        `${viewport?.offsetTop ?? 0}px`,
      );
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    viewport?.addEventListener('resize', updateViewportSize);
    viewport?.addEventListener('scroll', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
      viewport?.removeEventListener('resize', updateViewportSize);
      viewport?.removeEventListener('scroll', updateViewportSize);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-offset-top');
    };
  }, []);

  const handleOpenDrawer = (tab: DrawerTab) => {
    setPresetManagerOpen(false);
    setTagsOpen(false);
    setShortcutHelpOpen(false);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleOpenPresets = () => {
    setDrawerOpen(false);
    setTagsOpen(false);
    setShortcutHelpOpen(false);
    setPresetManagerOpen(true);
  };

  const handleTagsOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDrawerOpen(false);
      setPresetManagerOpen(false);
      setShortcutHelpOpen(false);
    }
    setTagsOpen(isOpen);
  };

  useAndroidAppLifecycle({
    hasOpenWindow: drawerOpen || tagsOpen || presetManagerOpen || shortcutHelpOpen,
    closeOpenWindow: () => {
      setDrawerOpen(false);
      setTagsOpen(false);
      setPresetManagerOpen(false);
      setShortcutHelpOpen(false);
    },
    flushPendingState: async () => {
      await Promise.all([
        leftEditor.flushPendingSave(),
        rightEditor.flushPendingSave(),
      ]);
    },
  });

  const applyHistoryVersion = (text: string) => {
    if (activeEditor === 'left') {
      leftEditor.updateValue(text);
    } else {
      rightEditor.updateValue(text);
    }
  };

  const applyCommand = useCallback((cmd: (text: string) => string) => {
    const editor = activeEditor === 'left' ? leftEditor : rightEditor;
    editor.updateValue(cmd(editor.value));
  }, [activeEditor, leftEditor, rightEditor]);

  const changeActiveEditor = useCallback((editor: 'left' | 'right') => {
    setActiveEditor(editor);
    if (layoutHydrated) void db.setSetting('activeEditor', editor);
  }, [layoutHydrated]);

  const changeDualMode = useCallback((nextDualMode: boolean) => {
    setDualMode(nextDualMode);
    if (layoutHydrated) void db.setSetting('dualMode', nextDualMode);
  }, [layoutHydrated]);

  useEffect(() => {
    if (!isDesktop) return;
    const handleDesktopShortcut = (event: KeyboardEvent) => {
      if (event.repeat || presetManagerOpen || shortcutHelpOpen || drawerOpen || tagsOpen) return;
      const editorTarget = event.target instanceof HTMLElement && event.target.hasAttribute('data-editor-id');
      if (isEditableTarget(event.target) && !editorTarget) return;

      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === 'Digit1') {
        event.preventDefault();
        changeActiveEditor('left');
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === 'Digit2') {
        event.preventDefault();
        changeActiveEditor('right');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === 'Backslash') {
        event.preventDefault();
        changeDualMode(!dualMode);
        return;
      }

      const preset = presets.find(item => item.shortcut && isShortcutMatch(event, item.shortcut));
      if (!preset) return;
      event.preventDefault();
      applyCommand(text => applyPreset(text, preset.data));
    };
    window.addEventListener('keydown', handleDesktopShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleDesktopShortcut, { capture: true });
  }, [applyCommand, changeActiveEditor, changeDualMode, drawerOpen, dualMode, isDesktop, presetManagerOpen, presets, shortcutHelpOpen, tagsOpen]);

  const insertTag = (tag: string) => {
    const editor = activeEditor === 'left' ? leftEditor : rightEditor;
    const start = editor.currentState.selectionStart;
    const end = editor.currentState.selectionEnd;
    const insertion = insertSunoTag(editor.value, start, end, tag);
    editor.updateValue(
      insertion.text,
      insertion.selectionStart,
      insertion.selectionEnd,
      true,
    );
  };

  return (
    <div className="app-shell">
      {/* Top Compact Command Panel */}
      <CommandPanel
        applyCommand={applyCommand}
        activeEditor={activeEditor}
        onActiveEditorChange={changeActiveEditor}
        tagsOpen={tagsOpen}
        onTagsOpenChange={handleTagsOpenChange}
        onOpenDrawer={handleOpenDrawer}
        onOpenPresets={handleOpenPresets}
        dualMode={dualMode}
        onDualModeChange={changeDualMode}
        onOpenShortcutHelp={() => {
          setDrawerOpen(false);
          setTagsOpen(false);
          setPresetManagerOpen(false);
          setShortcutHelpOpen(true);
        }}
      />
      
      {/* Main Dual Editors Area - Split 50/50 width */}
      <main className={`app-main ${dualMode ? 'is-dual-mode' : 'is-single-mode'}`}>
        <div className={`app-editor-pane ${
          (!tagsOpen && activeEditor === 'left') || (tagsOpen && activeEditor === 'right')
            ? 'is-mobile-visible'
            : ''
        } ${!dualMode && activeEditor !== 'left' ? 'is-single-hidden' : ''}`}>
          <Editor
            id="left"
            {...leftEditor}
            isActive={activeEditor === 'left'}
            onFocus={() => changeActiveEditor('left')}
            hydrated={leftEditor.hydrated}
          />
          {tagsOpen && activeEditor === 'right' && (
            <SunoTagsPanel
              editorKey="right"
              editorText={rightEditor.value}
              onInsert={insertTag}
              onChangeText={applyCommand}
              onClose={() => setTagsOpen(false)}
            />
          )}
        </div>
        <div className={`app-editor-pane ${
          (!tagsOpen && activeEditor === 'right') || (tagsOpen && activeEditor === 'left')
            ? 'is-mobile-visible'
            : ''
        } ${!dualMode && activeEditor !== 'right' ? 'is-single-hidden' : ''}`}>
          <Editor
            id="right"
            {...rightEditor}
            isActive={activeEditor === 'right'}
            onFocus={() => changeActiveEditor('right')}
            hydrated={rightEditor.hydrated}
          />
          {tagsOpen && activeEditor === 'left' && (
            <SunoTagsPanel
              editorKey="left"
              editorText={leftEditor.value}
              onInsert={insertTag}
              onChangeText={applyCommand}
              onClose={() => setTagsOpen(false)}
            />
          )}
        </div>
      </main>

      {/* Sliding Side Drawer for History, Data */}
      <SlidingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        applyHistoryVersion={applyHistoryVersion}
      />

      {presetManagerOpen && (
        <PresetManager onClose={() => setPresetManagerOpen(false)} />
      )}
      {shortcutHelpOpen && (
        <ShortcutHelp presets={presets} onClose={() => setShortcutHelpOpen(false)} />
      )}
    </div>
  );
};

export default App;
