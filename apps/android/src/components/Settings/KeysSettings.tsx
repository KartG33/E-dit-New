import { useState } from 'react';
import { db, type Preset, type PresetShortcut } from '../../lib/db';
import { ACTION_DEFINITIONS } from '../../lib/actions';
import { getActionShortcut, saveActionShortcut, shortcutConflict, validateActionShortcut } from '../../lib/actionShortcuts';
import { validatePresetShortcut } from '../../lib/hotkeys';
import { useActionShortcuts } from '../../hooks/useActionShortcuts';
import { ShortcutRecorder } from '../Shortcuts/ShortcutRecorder';

export function KeysSettings({ presets }: { presets: Preset[] }) {
  const { overrides, loaded } = useActionShortcuts();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const actions = [
    ...ACTION_DEFINITIONS.map(action => ({ ...action, shortcut: getActionShortcut(action.id, overrides) })),
    ...presets.map(preset => ({ id: `preset:${preset.id}`, label: preset.name, group: 'Presets', shortcut: preset.shortcut })),
  ].filter(action => `${action.label} ${action.group}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const save = async (id: string, shortcut: PresetShortcut | null | undefined) => {
    setBusy(true); setError(''); setMessage('');
    try { await saveActionShortcut(db, id, shortcut); setMessage('Shortcut saved.'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  return <div className="settings-keys">
    <input className="field-control" aria-label="Search actions" placeholder="Search commands, navigation or presets" value={query} onChange={event => setQuery(event.target.value)} />
    <p className="keys-help">Click a shortcut to change it. Esc cancels recording; Delete clears it. Shortcuts appear in button tooltips. Esc closes an open window.</p>
    <div role={error ? 'alert' : 'status'} className={error ? 'is-error' : ''}>{error || message}</div>
    <fieldset className="keys-list" disabled={!loaded || busy}>
      {actions.map(action => <div className="keys-row" key={action.id}>
        <div><span>{action.label}</span><small>{action.group}</small></div>
        <ShortcutRecorder label={action.label} value={action.shortcut} onError={setError}
          validate={value => (action.id.startsWith('preset:') ? validatePresetShortcut(value) : validateActionShortcut(action.id, value)) || shortcutConflict(action.id, value, overrides, presets)}
          onChange={value => { void save(action.id, value ?? null); }} />
        {!action.id.startsWith('preset:') && Object.hasOwn(overrides, action.id) && <button className="preset-secondary-button" aria-label={`Reset shortcut: ${action.label}`} onClick={() => { void save(action.id, undefined); }}>Reset</button>}
      </div>)}
      {!actions.length && <p>No matching actions.</p>}
    </fieldset>
  </div>;
}
