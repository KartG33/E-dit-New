import { useEffect, useState } from 'react';
import { Columns2, Settings2, Music, Zap, Clock, PanelTop, SlidersHorizontal } from 'lucide-react';
import { PresetsCommands } from './PresetsCommands';
import { SunoCommands } from './SunoCommands';
import { TextCommands } from './TextCommands';
import { db } from '../../lib/db';
import { DATA_IMPORTED } from '../../lib/editorPersistence';
import { useActions } from '../Shortcuts/ActionContext';
import { notify } from '../../lib/notifications';

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
  const { title } = useActions();
  const [activeTab, setActiveTab] = useState<'standard'|'suno'|'presets'>('standard');
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const load = () => { void db.getSetting('lastTab').then(tab => {
      if (mounted && !changed) setActiveTab(tab === 'suno' || tab === 'presets' ? tab : 'standard');
    }).catch(() => notify('Failed to load the last tab', true)); };
    const imported = () => { changed = false; load(); };
    const selected = () => { changed = true; };
    window.addEventListener(DATA_IMPORTED, imported);
    window.addEventListener('app-tab-selected', selected);
    load();
  return () => { mounted = false; window.removeEventListener(DATA_IMPORTED, imported); window.removeEventListener('app-tab-selected', selected); };
  }, []);

  const selectTab = (tab: 'standard'|'suno'|'presets') => {
    setActiveTab(tab);
    window.dispatchEvent(new Event('app-tab-selected'));
    void db.setSetting('lastTab', tab).catch(() => notify('Failed to save the last tab', true));
    if (tab !== 'suno') onTagsOpenChange?.(false);
  };

  useEffect(() => {
    const select = (event: Event) => {
      const tab = (event as CustomEvent).detail;
      if (tab === 'standard' || tab === 'suno' || tab === 'presets') selectTab(tab);
    };
    window.addEventListener('app-select-tab', select);
    return () => window.removeEventListener('app-select-tab', select);
  });

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
              title={title('tab.standard', 'Text')}
              aria-pressed={activeTab === 'standard'}
              className={`ui-tab ${activeTab === 'standard' ? 'is-active' : ''}`}
            >
              <Settings2 size={13}/> Text
            </button>
            <button
              onClick={() => selectTab('suno')}
              title={title('tab.suno', 'Suno')}
              aria-pressed={activeTab === 'suno'}
              className={`ui-tab ${activeTab === 'suno' ? 'is-active' : ''}`}
            >
              <Music size={13}/> Suno
            </button>
            <button
              onClick={() => selectTab('presets')}
              title={title('tab.presets', 'Presets')}
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
            onClick={() => onActiveEditorChange?.('left')} title={title('editor.left', 'Editor 1')} aria-label="Editor 1"
          >
            <span className="editor-switch-label">Editor </span>1
          </button>
          <button
            type="button"
            className={activeEditor === 'right' ? 'is-active' : ''}
            aria-pressed={activeEditor === 'right'}
            onClick={() => onActiveEditorChange?.('right')} title={title('editor.right', 'Editor 2')} aria-label="Editor 2"
          >
            <span className="editor-switch-label">Editor </span>2
          </button>
        </div>

        {/* Right Section: layout, History, Presets, and Settings */}
        <div className="ui-header-actions">
          <button
            type="button"
            onClick={() => onDualModeChange?.(!dualMode)}
            className="ui-action ui-icon-action desktop-only-action"
            aria-label={dualMode ? 'Use single editor' : 'Use two editors'}
            title={title('layout.toggle', dualMode ? 'Use single editor' : 'Use two editors')}
          >
            {dualMode ? <PanelTop size={16} className="icon-accent" /> : <Columns2 size={16} className="icon-accent" />}
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="ui-action ui-icon-action"
            aria-label="History"
            title={title('open.history', 'History')}
          >
            <Clock size={16} className="icon-accent" />
          </button>
          <button
            type="button"
            onClick={onOpenPresets}
            className="ui-action ui-icon-action desktop-only-action"
            aria-label="Manage presets"
            title={title('open.presets', 'Manage presets')}
          >
            <SlidersHorizontal size={16} className="icon-accent" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="ui-action ui-icon-action"
            aria-label="Settings"
            title={title('open.settings', 'Open Settings')}
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
