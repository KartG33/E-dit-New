import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, HardDrive, Keyboard, X } from 'lucide-react';
import type { Preset } from '../../lib/db';
import { formatShortcut } from '../../lib/hotkeys';
import { DataPanel } from '../Data/DataPanel';

type SettingsView = 'home' | 'keys' | 'data';

interface SettingsModalProps {
  presets: Preset[];
  onClose: () => void;
}

export const SettingsModal = ({ presets, onClose }: SettingsModalProps) => {
  const [view, setView] = useState<SettingsView>('home');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const title = view === 'keys' ? 'Keyboard shortcuts' : view === 'data' ? 'Data' : 'Settings';
  const description = view === 'keys'
    ? 'Desktop controls'
    : view === 'data'
      ? 'Import and export application data'
      : 'Choose a section';

  return (
    <div
      className="settings-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <header className="settings-modal-header">
          <div className="settings-modal-heading">
            {view !== 'home' && (
              <button
                type="button"
                className="icon-button settings-back-button"
                aria-label="Back to Settings"
                title="Back to Settings"
                onClick={() => setView('home')}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 id="settings-modal-title">{title}</h2>
              <p>{description}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button window-close-button"
            aria-label="Close Settings"
            title="Close Settings"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="settings-modal-content">
          {view === 'home' && (
            <div className="settings-section-list">
              <button type="button" className="settings-section-card" onClick={() => setView('keys')}>
                <span className="settings-section-icon"><Keyboard size={20} /></span>
                <span className="settings-section-copy">
                  <strong>Keys</strong>
                  <small>View keyboard shortcuts</small>
                </span>
                <ChevronRight size={18} />
              </button>
              <button type="button" className="settings-section-card" onClick={() => setView('data')}>
                <span className="settings-section-icon is-success"><HardDrive size={20} /></span>
                <span className="settings-section-copy">
                  <strong>Data</strong>
                  <small>Import or export application data</small>
                </span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {view === 'keys' && (
            <div className="settings-keys">
              <dl className="shortcut-list">
                <div><dt>Switch to Editor 1</dt><dd><kbd>Alt</kbd><span>+</span><kbd>1</kbd></dd></div>
                <div><dt>Switch to Editor 2</dt><dd><kbd>Alt</kbd><span>+</span><kbd>2</kbd></dd></div>
                <div><dt>One / two editors</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>\</kbd></dd></div>
                <div><dt>Undo</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>Z</kbd></dd></div>
                <div><dt>Redo</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>Y</kbd></dd></div>
                <div><dt>Close open window</dt><dd><kbd>Esc</kbd></dd></div>
              </dl>
              {presets.some(preset => preset.shortcut) && (
                <>
                  <h3>Presets</h3>
                  <dl className="shortcut-list">
                    {presets.filter(preset => preset.shortcut).map(preset => (
                      <div key={preset.id ?? preset.name}>
                        <dt>{preset.name}</dt>
                        <dd>{formatShortcut(preset.shortcut!)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          )}

          {view === 'data' && (
            <div className="settings-data">
              <DataPanel />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
