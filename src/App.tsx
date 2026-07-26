import { useState } from 'react';
import { Editor } from './components/Editor/Editor';
import { CommandPanel } from './components/Commands/CommandPanel';
import { NotesSidebar } from './components/Notes/NotesSidebar';
import { useEditor } from './hooks/useEditor';

const App = () => {
  const leftEditor = useEditor('left');
  const rightEditor = useEditor('right');
  const [activeEditor, setActiveEditor] = useState<'left' | 'right'>('left');

  const applyHistory = (text: string) => {
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
    <div className="flex h-screen w-full bg-zinc-100 dark:bg-zinc-950 p-4 gap-4 text-zinc-900 dark:text-zinc-100">
      <CommandPanel applyCommand={applyCommand} insertText={insertText} />
      
      <div className="flex-1 h-full">
        <Editor 
          id="left"
          {...leftEditor}
          isActive={activeEditor === 'left'}
          onFocus={() => setActiveEditor('left')}
          hydrated={leftEditor.hydrated}
        />
      </div>
      <div className="flex-1 h-full">
        <Editor 
          id="right"
          {...rightEditor}
          isActive={activeEditor === 'right'}
          onFocus={() => setActiveEditor('right')}
          hydrated={rightEditor.hydrated}
        />
      </div>
      
      {/* Notes Sidebar */}
      <NotesSidebar applyHistory={applyHistory} />
    </div>
  );
};

export default App;
