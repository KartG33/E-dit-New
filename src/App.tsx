import { useCallback, useEffect, useState } from 'react';
import { Editor } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { SlidingDrawer } from './components/Drawer/SlidingDrawer';
import { SunoTagsPanel } from './components/SunoTags/SunoTagsPanel';
import { PresetManager } from './components/Presets/PresetManager';
import { SettingsModal } from './components/Settings/SettingsModal';
import { QuickTextEditModal } from './components/TextEdit/QuickTextEditModal';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickEditEditor, setQuickEditEditor] = useState<'left' | 'right' | null>(null);
  const [dualMode, setDualMode] = useState(true);
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const { presets } = usePresets();
  const isDesktop = useDesktopLayout();

  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const handleOpenHistory = () => {
    setPresetManagerOpen(false);
    setTagsOpen(false);
    setSettingsOpen(false);
    setQuickEditEditor(null);
    setDrawerOpen(true);
  };

  const handleOpenPresets = () => {
    setDrawerOpen(false);
    setTagsOpen(false);
    setSettingsOpen(false);
    setQuickEditEditor(null);
    setPresetManagerOpen(true);
  };

  const handleTagsOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDrawerOpen(false);
      setPresetManagerOpen(false);
      setSettingsOpen(false);
      setQuickEditEditor(null);
    }
    setTagsOpen(isOpen);
  };

  useAndroidAppLifecycle({
    hasOpenWindow: drawerOpen || tagsOpen || presetManagerOpen || settingsOpen || quickEditEditor !== null,
    closeOpenWindow: () => {
      setDrawerOpen(false);
      setTagsOpen(false);
      setPresetManagerOpen(false);
      setSettingsOpen(false);
      setQuickEditEditor(null);
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
      if (event.repeat || presetManagerOpen || settingsOpen || quickEditEditor !== null || drawerOpen || tagsOpen) return;
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
  }, [applyCommand, changeActiveEditor, changeDualMode, drawerOpen, dualMode, isDesktop, presetManagerOpen, presets, quickEditEditor, settingsOpen, tagsOpen]);

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
        onOpenHistory={handleOpenHistory}
        onOpenPresets={handleOpenPresets}
        dualMode={dualMode}
        onDualModeChange={changeDualMode}
        onOpenSettings={() => {
          setDrawerOpen(false);
          setTagsOpen(false);
          setPresetManagerOpen(false);
          setQuickEditEditor(null);
          setSettingsOpen(true);
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
            onOpenQuickEdit={() => {
              changeActiveEditor('left');
              setDrawerOpen(false);
              setTagsOpen(false);
              setPresetManagerOpen(false);
              setSettingsOpen(false);
              setQuickEditEditor('left');
            }}
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
            onOpenQuickEdit={() => {
              changeActiveEditor('right');
              setDrawerOpen(false);
              setTagsOpen(false);
              setPresetManagerOpen(false);
              setSettingsOpen(false);
              setQuickEditEditor('right');
            }}
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

      {/* Sliding Side Drawer for History */}
      <SlidingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        applyHistoryVersion={applyHistoryVersion}
      />

      {presetManagerOpen && (
        <PresetManager onClose={() => setPresetManagerOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsModal presets={presets} onClose={() => setSettingsOpen(false)} />
      )}
      {quickEditEditor && (
        <QuickTextEditModal
          editorId={quickEditEditor}
          value={quickEditEditor === 'left' ? leftEditor.value : rightEditor.value}
          onApply={nextValue => {
            const editor = quickEditEditor === 'left' ? leftEditor : rightEditor;
            editor.updateValue(nextValue, nextValue.length, nextValue.length, true);
          }}
          onClose={() => setQuickEditEditor(null)}
        />
      )}
    </div>
  );
};

export default App;
