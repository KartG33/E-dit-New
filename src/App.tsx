import { useState } from 'react';
import { Editor } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { SlidingDrawer } from './components/Drawer/SlidingDrawer';
import type { DrawerTab } from './components/Drawer/SlidingDrawer';
import { useEditor } from './hooks/useEditor';

const App = () => {
  const leftEditor = useEditor('left');
  const rightEditor = useEditor('right');
  const [activeEditor, setActiveEditor] = useState<'left' | 'right'>('left');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('history');

  const handleOpenDrawer = (tab: DrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
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

  const insertText = (text: string) => {
    const editor = activeEditor === 'left' ? leftEditor : rightEditor;
    const start = editor.currentState.selectionStart;
    const end = editor.currentState.selectionEnd;
    const val = editor.value;
    const before = val.substring(0, start);
    const after = val.substring(end);
    const newVal = before + text + after;
    const newPos = start + text.length;
    editor.updateValue(newVal, newPos, newPos, true);
  };

  return (
    <div className="app-shell">
      {/* Top Compact Command Panel */}
      <CommandPanel 
        applyCommand={applyCommand} 
        activeEditor={activeEditor}
        editorText={activeEditor === 'left' ? leftEditor.value : rightEditor.value}
        insertText={insertText} 
        onOpenDrawer={handleOpenDrawer}
      />
      
      {/* Main Dual Editors Area - Split 50/50 width */}
      <main className="app-main">
        <div className="app-editor-pane">
          <Editor 
            id="left"
            {...leftEditor}
            isActive={activeEditor === 'left'}
            onFocus={() => setActiveEditor('left')}
            hydrated={leftEditor.hydrated}
          />
        </div>
        <div className="app-editor-pane">
          <Editor 
            id="right"
            {...rightEditor}
            isActive={activeEditor === 'right'}
            onFocus={() => setActiveEditor('right')}
            hydrated={rightEditor.hydrated}
          />
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
    </div>
  );
};

export default App;
