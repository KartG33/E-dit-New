import { useEffect, useState } from 'react';
import type { PresetShortcut } from '../../lib/db';
import { formatShortcut, isModifierCode, shortcutFromEvent, validatePresetShortcut } from '../../lib/hotkeys';

interface Props {
  value?: PresetShortcut;
  onChange: (value: PresetShortcut | undefined) => void;
  validate?: (value: PresetShortcut) => string | null;
  onError?: (message: string) => void;
  label?: string;
}
export function ShortcutRecorder({ value, onChange, validate = validatePresetShortcut, onError, label }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!recording) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') { setRecording(false); return; }
      if (event.key === 'Delete' || event.key === 'Backspace') { onChange(undefined); setRecording(false); return; }
      if (isModifierCode(event.code)) return;
      const shortcut = shortcutFromEvent(event);
      const invalid = validate(shortcut);
      if (invalid) { setError(invalid); onError?.(invalid); return; }
      setError(''); onError?.(''); onChange(shortcut); setRecording(false);
    };
    window.addEventListener('keydown', capture, true);
    return () => { window.removeEventListener('keydown', capture, true); };
  }, [recording, onChange, onError, validate]);
  return <div className="shortcut-recorder" data-recording-shortcut={recording || undefined}>
    <button type="button" className="preset-secondary-button" aria-label={label ? `Assign shortcut: ${label}` : undefined}
      onClick={() => { setRecording(true); setError(''); onError?.(''); }}>
      {recording ? 'Press shortcut…' : value ? formatShortcut(value) : 'Assign shortcut'}
    </button>
    {value && !recording && <button type="button" className="preset-icon-action" aria-label={label ? `Clear shortcut: ${label}` : 'Clear keyboard shortcut'} onClick={() => onChange(undefined)}>×</button>}
    {error && !onError && <small role="alert">{error}</small>}
  </div>;
}
