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
    <div className="flex flex-col h-screen w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top Compact Command Panel */}
      <CommandPanel 
        applyCommand={applyCommand} 
        editorText={activeEditor === 'left' ? leftEditor.value : rightEditor.value}
        insertText={insertText} 
        onOpenDrawer={handleOpenDrawer}
      />
      
      {/* Main Dual Editors Area - Split 50/50 width */}
      <main className="flex-1 flex gap-3 p-3 min-h-0 w-full overflow-hidden">
        <div className="w-1/2 flex-1 h-full min-w-0">
          <Editor 
            id="left"
            {...leftEditor}
            isActive={activeEditor === 'left'}
            onFocus={() => setActiveEditor('left')}
            hydrated={leftEditor.hydrated}
          />
        </div>
        <div className="w-1/2 flex-1 h-full min-w-0">
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
