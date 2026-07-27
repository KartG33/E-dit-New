import { useState } from 'react';
import { Settings2, Music, Zap, Clock, StickyNote, HardDrive } from 'lucide-react';
import { clean as sunoClean, space as sunoSpace, upper as sunoUpper, lyrics as sunoLyrics, structure as sunoStructure, trim as sunoTrim } from '../../lib/commands/suno';
import { spaces, edges, line1, lineX, inline, inlineComma, lower, sentence, removeSpaceBeforePunctuation, addSpaceAfterPunctuation, upper as textUpper } from '../../lib/commands/text';
import { SunoTagsEditor } from '../SunoTags/SunoTagsEditor';
import { PresetsTab } from './PresetsTab';
import type { DrawerTab } from '../Drawer/SlidingDrawer';

interface CommandPanelProps {
  applyCommand: (cmd: (text: string) => string) => void;
  insertText: (text: string) => void;
  onOpenDrawer?: (tab: DrawerTab) => void;
}

export const CommandPanel = ({ applyCommand, insertText, onOpenDrawer }: CommandPanelProps) => {
  const [activeTab, setActiveTab] = useState<'standard'|'suno'|'presets'>('standard');

  return (
    <header className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-2xs px-3 py-2 flex flex-col gap-2 transition-all">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        {/* Left Section: App Title & Command Category Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-900 dark:text-zinc-100 pr-2 border-r border-zinc-200 dark:border-zinc-800">
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-black tracking-wider">E-DIT</span>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
            <button 
              onClick={() => setActiveTab('standard')}
              className={`px-3 py-1 font-medium rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'standard' 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Settings2 size={13}/> Text
            </button>
            <button 
              onClick={() => setActiveTab('suno')}
              className={`px-3 py-1 font-medium rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'suno' 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Music size={13}/> Suno
            </button>
            <button 
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1 font-medium rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'presets' 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Zap size={13}/> Presets
            </button>
          </div>
        </div>

        {/* Right Section: Drawer Toggle Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDrawer?.('history')}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
            title="Открыть историю"
          >
            <Clock size={13} className="text-blue-500" />
            <span className="hidden sm:inline">История</span>
          </button>
          <button
            onClick={() => onOpenDrawer?.('notes')}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
            title="Открыть заметки"
          >
            <StickyNote size={13} className="text-amber-500" />
            <span className="hidden sm:inline">Заметки</span>
          </button>
          <button
            onClick={() => onOpenDrawer?.('backup')}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
            title="Открыть бекап"
          >
            <HardDrive size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">Бекап</span>
          </button>
        </div>
      </div>

      {/* Active Commands Toolbar Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-zinc-100 dark:border-zinc-800/80">
        {activeTab === 'standard' && (
          <div className="flex flex-wrap items-center gap-1.5 w-full">
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
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            <CommandBtn label="Suno Clean" onClick={() => applyCommand(sunoClean)} />
            <CommandBtn label="Suno Space" onClick={() => applyCommand(sunoSpace)} />
            <CommandBtn label="Suno Upper" onClick={() => applyCommand(sunoUpper)} />
            <CommandBtn label="Suno Lyrics" onClick={() => applyCommand(sunoLyrics)} />
            <CommandBtn label="Suno Structure" onClick={() => applyCommand(sunoStructure)} />
            
            <div className="border-l border-zinc-200 dark:border-zinc-700 pl-2 ml-1">
              <SunoTagsEditor onInsert={insertText} />
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="w-full">
            <PresetsTab applyCommand={applyCommand} />
          </div>
        )}
      </div>
    </header>
  );
};

const CommandBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="py-1 px-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 border border-zinc-200 dark:border-zinc-700/80 rounded-md transition-colors font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs whitespace-nowrap"
  >
    {label}
  </button>
);
