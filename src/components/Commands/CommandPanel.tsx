import { useState } from 'react';
import { Columns2, Settings2, Music, Zap, Clock, PanelTop, SlidersHorizontal } from 'lucide-react';
import { PresetsCommands } from './PresetsCommands';
import { SunoCommands } from './SunoCommands';
import { TextCommands } from './TextCommands';

interface CommandPanelProps {
  applyCommand: (cmd: (text: string) => string) => void;
  activeEditor?: 'left' | 'right';
  onActiveEditorChange?: (editor: 'left' | 'right') => void;
  tagsOpen?: boolean;
  onTagsOpenChange?: (isOpen: boolean) => void;
  onOpenHistory?: () => void;
  onOpenPresets?: () => void;
  dualMode?: boolean;
  onDualModeChange?: (dualMode: boolean) => void;
  onOpenSettings?: () => void;
}

export const CommandPanel = ({
  applyCommand,
  activeEditor = 'left',
  onActiveEditorChange,
  tagsOpen = false,
  onTagsOpenChange,
  onOpenHistory,
  onOpenPresets,
  dualMode = true,
  onDualModeChange,
  onOpenSettings,
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

        <div className={`mobile-editor-switcher ${!dualMode ? 'is-desktop-visible' : ''}`} aria-label="Active editor">
          <button
            type="button"
            className={activeEditor === 'left' ? 'is-active' : ''}
            aria-pressed={activeEditor === 'left'}
            onClick={() => onActiveEditorChange?.('left')}
          >
            Editor 1
          </button>
          <button
            type="button"
            className={activeEditor === 'right' ? 'is-active' : ''}
            aria-pressed={activeEditor === 'right'}
            onClick={() => onActiveEditorChange?.('right')}
          >
            Editor 2
          </button>
        </div>

        {/* Right Section: layout, History, Presets, and Settings */}
        <div className="ui-header-actions">
          <button
            type="button"
            onClick={() => onDualModeChange?.(!dualMode)}
            className="ui-action ui-icon-action"
            aria-label={dualMode ? 'Use single editor' : 'Use two editors'}
            title={`${dualMode ? 'Use single editor' : 'Use two editors'} (Ctrl+\\)`}
          >
            {dualMode ? <PanelTop size={16} className="icon-accent" /> : <Columns2 size={16} className="icon-accent" />}
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="ui-action ui-icon-action"
            aria-label="History"
            title="Открыть историю"
          >
            <Clock size={16} className="icon-accent" />
          </button>
          <button
            type="button"
            onClick={onOpenPresets}
            className="ui-action ui-icon-action"
            aria-label="Manage presets"
            title="Manage presets"
          >
            <SlidersHorizontal size={16} className="icon-accent" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="ui-action ui-icon-action"
            aria-label="Settings"
            title="Open Settings"
          >
            <Settings2 size={16} />
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
