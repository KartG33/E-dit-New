import { useState } from 'react';
import { Settings2, Music, Zap } from 'lucide-react';
import { clean as sunoClean, space as sunoSpace, upper as sunoUpper, lyrics as sunoLyrics, structure as sunoStructure, trim as sunoTrim } from '../../lib/commands/suno';
import { spaces, edges, line1, lineX, inline, inlineComma, lower, sentence, removeSpaceBeforePunctuation, addSpaceAfterPunctuation, upper as textUpper } from '../../lib/commands/text';
import { SunoTagsEditor } from '../SunoTags/SunoTagsEditor';
import { PresetsTab } from './PresetsTab';

interface CommandPanelProps {
  applyCommand: (cmd: (text: string) => string) => void;
}

export const CommandPanel = ({ applyCommand, insertText }: CommandPanelProps & { insertText: (text: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'standard'|'suno'|'presets'>('standard');

  return (
    <div className="w-72 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden">
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('standard')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'standard' ? 'bg-white dark:bg-zinc-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
        ><Settings2 size={14}/> Text</button>
        <button 
          onClick={() => setActiveTab('suno')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'suno' ? 'bg-white dark:bg-zinc-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
        ><Music size={14}/> Suno</button>
        <button 
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'presets' ? 'bg-white dark:bg-zinc-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
        ><Zap size={14}/> Presets</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 bg-zinc-50/50 dark:bg-zinc-950">
        {activeTab === 'standard' && (
          <div className="grid grid-cols-2 gap-2">
            <CommandBtn label="Trim" onClick={() => applyCommand(sunoTrim)} />
            <CommandBtn label="Spaces" onClick={() => applyCommand(spaces)} />
            <CommandBtn label="Edges" onClick={() => applyCommand(edges)} />
            <CommandBtn label="Upper" onClick={() => applyCommand(textUpper)} />
            <CommandBtn label="Lower" onClick={() => applyCommand(lower)} />
            <CommandBtn label="Sentence" onClick={() => applyCommand(sentence)} />
            <CommandBtn label="Line 1" onClick={() => applyCommand(line1)} />
            <CommandBtn label="Line X" onClick={() => applyCommand(lineX)} />
            <CommandBtn label="Inline ," onClick={() => applyCommand(inlineComma)} />
            <CommandBtn label="Inline" onClick={() => applyCommand(inline)} />
            <CommandBtn label="- Space Punct" onClick={() => applyCommand(removeSpaceBeforePunctuation)} />
            <CommandBtn label="+ Space Punct" onClick={() => applyCommand(addSpaceAfterPunctuation)} />
          </div>
        )}
        
        {activeTab === 'suno' && (
          <div className="flex flex-col gap-2">
            <CommandBtn label="Suno Clean" onClick={() => applyCommand(sunoClean)} />
            <CommandBtn label="Suno Space" onClick={() => applyCommand(sunoSpace)} />
            <CommandBtn label="Suno Upper" onClick={() => applyCommand(sunoUpper)} />
            <CommandBtn label="Suno Lyrics" onClick={() => applyCommand(sunoLyrics)} />
            <CommandBtn label="Suno Structure" onClick={() => applyCommand(sunoStructure)} />
            
            <SunoTagsEditor onInsert={insertText} />
          </div>
        )}
        
        {activeTab === 'presets' && (
          <PresetsTab applyCommand={applyCommand} />
        )}
      </div>
    </div>
  );
};

const CommandBtn = ({ label, onClick, colSpan }: { label: string, onClick: () => void, colSpan?: number }) => (
  <button 
    onClick={onClick}
    className={`w-full py-2 px-3 text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm transition-colors font-medium text-zinc-700 dark:text-zinc-300 ${colSpan === 2 ? 'col-span-2' : ''}`}
  >
    {label}
  </button>
);
