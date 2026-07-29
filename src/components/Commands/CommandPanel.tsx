import { useState } from 'react';
import { Settings2, Music, Zap, Clock, HardDrive } from 'lucide-react';
import type { DrawerTab } from '../Drawer/SlidingDrawer';
import { PresetsCommands } from './PresetsCommands';
import { SunoCommands } from './SunoCommands';
import { TextCommands } from './TextCommands';

interface CommandPanelProps {
  applyCommand: (cmd: (text: string) => string) => void;
  editorText?: string;
  insertText: (text: string) => void;
  onOpenDrawer?: (tab: DrawerTab) => void;
}

export const CommandPanel = ({ applyCommand, editorText = '', insertText, onOpenDrawer }: CommandPanelProps) => {
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

        {/* Right Section: Drawer Toggle Buttons (History & Data) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenDrawer?.('history')}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
            title="Открыть историю"
          >
            <Clock size={13} className="text-blue-500" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => onOpenDrawer?.('data')}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1.5"
            title="Открыть данные"
          >
            <HardDrive size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">Data</span>
          </button>
        </div>
      </div>

      {/* Active Commands Toolbar Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-zinc-100 dark:border-zinc-800/80">
        {activeTab === 'standard' && (
          <TextCommands applyCommand={applyCommand} />
        )}

        {activeTab === 'suno' && (
          <SunoCommands applyCommand={applyCommand} editorText={editorText} insertText={insertText} />
        )}

        {activeTab === 'presets' && (
          <PresetsCommands applyCommand={applyCommand} />
        )}
      </div>
    </header>
  );
};
