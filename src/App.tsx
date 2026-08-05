import { useState } from 'react';
import { Editor } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { SlidingDrawer } from './components/Drawer/SlidingDrawer';
import { SunoTagsPanel } from './components/SunoTags/SunoTagsPanel';
import { PresetManager } from './components/Presets/PresetManager';
import type { DrawerTab } from './components/Drawer/SlidingDrawer';
import { useEditor } from './hooks/useEditor';
import { insertSunoTag } from './lib/commands/suno';

const App = () => {
  const leftEditor = useEditor('left');
  const rightEditor = useEditor('right');
  const [activeEditor, setActiveEditor] = useState<'left' | 'right'>('left');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('history');

  const handleOpenDrawer = (tab: DrawerTab) => {
    setPresetManagerOpen(false);
    setTagsOpen(false);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleOpenPresets = () => {
    setDrawerOpen(false);
    setTagsOpen(false);
    setPresetManagerOpen(true);
  };

  const handleTagsOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDrawerOpen(false);
      setPresetManagerOpen(false);
    }
    setTagsOpen(isOpen);
  };

  const applyHistoryVersion = (text: string) => {
    if (activeEditor === 'left') {
      leftEditor.updateValue(text);
    } else {
      rightEditor.updateValue(text);
    }
  };

  const applyCommand = (cmd: (text: string) => string) => {
    const editor = activeEditor === 'left' ? leftEditor : rightEditor;
    editor.updateValue(cmd(editor.value));
  };

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
        onActiveEditorChange={setActiveEditor}
        tagsOpen={tagsOpen}
        onTagsOpenChange={handleTagsOpenChange}
        onOpenDrawer={handleOpenDrawer}
        onOpenPresets={handleOpenPresets}
      />
      
      {/* Main Dual Editors Area - Split 50/50 width */}
      <main className="app-main">
        <div className={`app-editor-pane ${
          (!tagsOpen && activeEditor === 'left') || (tagsOpen && activeEditor === 'right')
            ? 'is-mobile-visible'
            : ''
        }`}>
          <Editor 
            id="left"
            {...leftEditor}
            isActive={activeEditor === 'left'}
            onFocus={() => setActiveEditor('left')}
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
        }`}>
          <Editor 
            id="right"
            {...rightEditor}
            isActive={activeEditor === 'right'}
            onFocus={() => setActiveEditor('right')}
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
    </div>
  );
};

export default App;
