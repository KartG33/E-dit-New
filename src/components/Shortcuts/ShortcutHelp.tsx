import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Preset } from '../../lib/db';
import { formatShortcut } from '../../lib/hotkeys';

interface ShortcutHelpProps {
  presets: Preset[];
  onClose: () => void;
}

export const ShortcutHelp = ({ presets, onClose }: ShortcutHelpProps) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="shortcut-help-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="shortcut-help" role="dialog" aria-modal="true" aria-labelledby="shortcut-help-title">
      <header className="shortcut-help-header">
        <div>
          <h2 id="shortcut-help-title">Keyboard shortcuts</h2>
          <p>Desktop controls</p>
        </div>
        <button type="button" className="icon-button window-close-button" aria-label="Close keyboard shortcuts" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="shortcut-help-content">
        <dl className="shortcut-list">
          <div><dt>Switch to Editor 1</dt><dd><kbd>Alt</kbd><span>+</span><kbd>1</kbd></dd></div>
          <div><dt>Switch to Editor 2</dt><dd><kbd>Alt</kbd><span>+</span><kbd>2</kbd></dd></div>
          <div><dt>One / two editors</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>\\</kbd></dd></div>
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
    </section>
  </div>;
};
