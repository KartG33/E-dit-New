import { useState } from 'react';
import { Settings2, Music, Zap, Clock, HardDrive, SlidersHorizontal } from 'lucide-react';
import type { DrawerTab } from '../Drawer/SlidingDrawer';
import { PresetsCommands } from './PresetsCommands';
import { SunoCommands } from './SunoCommands';
import { TextCommands } from './TextCommands';

interface CommandPanelProps {
  applyCommand: (cmd: (text: string) => string) => void;
  tagsOpen?: boolean;
  onTagsOpenChange?: (isOpen: boolean) => void;
  onOpenDrawer?: (tab: DrawerTab) => void;
  onOpenPresets?: () => void;
}

export const CommandPanel = ({
  applyCommand,
  tagsOpen = false,
  onTagsOpenChange,
  onOpenDrawer,
  onOpenPresets,
}: CommandPanelProps) => {
  const [activeTab, setActiveTab] = useState<'standard'|'suno'|'presets'>('standard');

  const selectTab = (tab: 'standard'|'suno'|'presets') => {
    setActiveTab(tab);
    if (tab !== 'suno') onTagsOpenChange?.(false);
  };

  return (
    <header className="ui-header">
      {/* Top Header Navigation */}
      <div className="ui-header-row">
        {/* Left Section: App Title & Command Category Tabs */}
        <div className="ui-header-left">
          <div className="brand-lockup">
            <span className="brand-mark">E-DIT</span>
          </div>

          <div className="ui-tabs">
            <button 
              onClick={() => selectTab('standard')}
              aria-pressed={activeTab === 'standard'}
              className={`ui-tab ${activeTab === 'standard' ? 'is-active' : ''}`}
            >
              <Settings2 size={13}/> Text
            </button>
            <button 
              onClick={() => selectTab('suno')}
              aria-pressed={activeTab === 'suno'}
              className={`ui-tab ${activeTab === 'suno' ? 'is-active' : ''}`}
            >
              <Music size={13}/> Suno
            </button>
            <button 
              onClick={() => selectTab('presets')}
              aria-pressed={activeTab === 'presets'}
              className={`ui-tab ${activeTab === 'presets' ? 'is-active' : ''}`}
            >
              <Zap size={13}/> Presets
            </button>
          </div>
        </div>

        {/* Right Section: History, preset management, and Data */}
        <div className="ui-header-actions">
          <button
            onClick={() => onOpenDrawer?.('history')}
            className="ui-action"
            title="Открыть историю"
          >
            <Clock size={13} className="icon-accent" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={onOpenPresets}
            className="ui-action"
            aria-label="Manage presets"
            title="Manage presets"
          >
            <SlidersHorizontal size={13} className="icon-accent" />
            <span className="hidden sm:inline">Presets</span>
          </button>
          <button
            onClick={() => onOpenDrawer?.('data')}
            className="ui-action"
            title="Открыть данные"
          >
            <HardDrive size={13} className="icon-success" />
            <span className="hidden sm:inline">Data</span>
          </button>
        </div>
      </div>

      {/* Active Commands Toolbar Row */}
      <div className="ui-toolbar">
        {activeTab === 'standard' && (
          <TextCommands applyCommand={applyCommand} />
        )}

        {activeTab === 'suno' && (
          <SunoCommands
            applyCommand={applyCommand}
            tagsOpen={tagsOpen}
            onTagsOpenChange={(isOpen) => onTagsOpenChange?.(isOpen)}
          />
        )}

        {activeTab === 'presets' && (
          <PresetsCommands applyCommand={applyCommand} />
        )}
      </div>
    </header>
  );
};
