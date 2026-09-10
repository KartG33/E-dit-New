import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, HardDrive, Keyboard, X } from 'lucide-react';
import type { Preset } from '../../lib/db';
import { KeysSettings } from './KeysSettings';
import { DataPanel } from '../Data/DataPanel';
import { useDialog } from '../../hooks/useDialog';

type SettingsView = 'home' | 'keys' | 'data';

interface SettingsModalProps {
  presets: Preset[];
  onClose: () => void;
  initialView?: SettingsView;
}

export const SettingsModal = ({ presets, onClose, initialView = 'home' }: SettingsModalProps) => {
  const [view, setView] = useState<SettingsView>(initialView);
  const { dialogRef, backdropProps } = useDialog(onClose);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, view]);


  const title = view === 'keys' ? 'Keyboard shortcuts' : view === 'data' ? 'Data' : 'Settings';
  const description = view === 'keys'
    ? 'Desktop controls'
    : view === 'data'
      ? 'Import and export application data'
      : 'Choose a section';

  return (
    <div
      className="settings-modal-backdrop"
      {...backdropProps}
    >
      <section
        ref={dialogRef}
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

          {view === 'keys' && <KeysSettings presets={presets} />}

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
