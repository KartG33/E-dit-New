import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Settings2, Trash2, X } from 'lucide-react';
import { db, type EditDatabase, type Preset, type PresetData } from '../../lib/db';
import type { CommandId } from '../../lib/commands/registry';
import {
  PRESET_COMMAND_OPTIONS,
  getPresetCommandLabel,
} from '../../lib/presets/commandOptions';
import { usePresets } from '../../hooks/usePresets';

interface PresetManagerProps {
  onClose: () => void;
  database?: EditDatabase;
}

type PresetKind = PresetData['type'];
type MobilePresetView = 'list' | 'editor';

const defaultCommandId: CommandId = 'text.spaces';

export const PresetManager = ({ onClose, database = db }: PresetManagerProps) => {
  const { presets, isLoading } = usePresets(database);
  const [initialized, setInitialized] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PresetKind>('chain');
  const [commands, setCommands] = useState<CommandId[]>([]);
  const [commandToAdd, setCommandToAdd] = useState<CommandId>(defaultCommandId);
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [replaceAll, setReplaceAll] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mobileView, setMobileView] = useState<MobilePresetView>('list');

  const resetForm = () => {
    setInitialized(true);
    setEditingId(null);
    setName('');
    setKind('chain');
    setCommands([]);
    setCommandToAdd(defaultCommandId);
    setPattern('');
    setReplacement('');
    setReplaceAll(true);
    setIgnoreCase(false);
    setError('');
    setSavedMessage('');
    setConfirmDelete(false);
    setMobileView('editor');
  };

  const loadPreset = (preset: Preset, openEditor = true) => {
    setEditingId(preset.id ?? null);
    setName(preset.name);
    setKind(preset.data.type);
    setError('');
    setSavedMessage('');
    setConfirmDelete(false);
    if (openEditor) {
      setInitialized(true);
      setMobileView('editor');
    }

    if (preset.data.type === 'chain') {
      setCommands(preset.data.commands);
      setPattern('');
      setReplacement('');
      setReplaceAll(true);
      setIgnoreCase(false);
    } else {
      setCommands([]);
      setPattern(preset.data.pattern);
      setReplacement(preset.data.replacement);
      setReplaceAll(preset.data.flags.includes('g'));
      setIgnoreCase(preset.data.flags.includes('i'));
    }
  };

  useEffect(() => {
    if (!isLoading && !initialized) {
      if (presets.length > 0) loadPreset(presets[0], false);
      setInitialized(true);
    }
  }, [initialized, isLoading, presets]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const buildPresetData = (): PresetData | null => {
    if (kind === 'chain') {
      if (commands.length === 0) {
        setError('Add at least one command.');
        return null;
      }
      return { type: 'chain', commands };
    }

    if (!pattern) {
      setError('Enter a search pattern.');
      return null;
    }
    const flags = `${replaceAll ? 'g' : ''}${ignoreCase ? 'i' : ''}`;
    try {
      new RegExp(pattern, flags);
    } catch {
      setError('The search pattern is not a valid regular expression.');
      return null;
    }
    return { type: 'regex', pattern, flags, replacement };
  };

  const savePreset = async () => {
    const normalizedName = name.trim();
    setError('');
    setSavedMessage('');
    setConfirmDelete(false);

    if (!normalizedName) {
      setError('Enter a preset name.');
      return;
    }
    const duplicate = presets.some(preset =>
      preset.id !== editingId && preset.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
    );
    if (duplicate) {
      setError('A preset with this name already exists.');
      return;
    }

    const data = buildPresetData();
    if (!data) return;

    const now = Date.now();
    if (editingId !== null) {
      await database.presets.update(editingId, {
        name: normalizedName,
        data,
        updatedAt: now,
      });
    } else {
      const nextOrder = presets.reduce((maximum, preset) => Math.max(maximum, preset.order ?? -1), -1) + 1;
      const id = await database.presets.add({
        name: normalizedName,
        data,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        order: nextOrder,
      });
      setEditingId(id);
    }
    setName(normalizedName);
    setSavedMessage('Saved.');
  };

  const deletePreset = async () => {
    if (editingId === null) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setSavedMessage('');
      return;
    }

    const remaining = presets.filter(preset => preset.id !== editingId);
    await database.presets.delete(editingId);
    if (remaining.length > 0) loadPreset(remaining[0], false);
    else resetForm();
    setMobileView('list');
  };

  const movePreset = async (direction: -1 | 1) => {
    const index = presets.findIndex(preset => preset.id === editingId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= presets.length) return;
    const current = presets[index];
    const target = presets[targetIndex];
    if (current.id === undefined || target.id === undefined) return;

    await database.transaction('rw', database.presets, async () => {
      await database.presets.update(current.id!, { order: target.order ?? targetIndex, updatedAt: Date.now() });
      await database.presets.update(target.id!, { order: current.order ?? index, updatedAt: Date.now() });
    });
  };

  const moveCommand = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= commands.length) return;
    const nextCommands = [...commands];
    [nextCommands[index], nextCommands[targetIndex]] = [nextCommands[targetIndex], nextCommands[index]];
    setCommands(nextCommands);
  };

  const selectedPresetIndex = presets.findIndex(preset => preset.id === editingId);

  return (
    <div
      className="preset-manager-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="preset-manager-backdrop"
    >
      <section
        className="preset-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-manager-title"
      >
        <header className="preset-manager-header">
          <div>
            <h2 id="preset-manager-title">Presets</h2>
            <p>Create and manage reusable text actions</p>
          </div>
          <button type="button" className="icon-button preset-manager-close-button window-close-button" aria-label="Close presets" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div
          className={`preset-manager-body is-mobile-${mobileView}`}
          data-testid="preset-manager-body"
        >
          <aside className="preset-manager-list">
            <button type="button" className="preset-new-button" onClick={resetForm}>
              <Plus size={15} /> New preset
            </button>
            <div className="preset-manager-list-scroll">
              {presets.map(preset => (
                <button
                  type="button"
                  key={preset.id ?? preset.name}
                  className={`preset-manager-list-item ${preset.id === editingId ? 'is-active' : ''}`}
                  onClick={() => loadPreset(preset)}
                >
                  <span>{preset.name}</span>
                  <small>{preset.data.type === 'chain' ? 'Command sequence' : 'Find & replace'}</small>
                </button>
              ))}
              {!isLoading && presets.length === 0 && (
                <div className="preset-manager-empty">No presets yet.</div>
              )}
            </div>
          </aside>

          <div className="preset-manager-editor">
            <div className="preset-form-topline">
              <div className="preset-form-heading">
                <button
                  type="button"
                  className="preset-back-button"
                  aria-label="Back to preset list"
                  onClick={() => setMobileView('list')}
                >
                  <ArrowLeft size={18} />
                </button>
                <h3>{editingId === null ? 'New preset' : 'Edit preset'}</h3>
              </div>
              {editingId !== null && (
                <div className="preset-order-actions" aria-label="Preset order">
                  <button
                    type="button"
                    className="preset-icon-action"
                    aria-label="Move preset up"
                    disabled={selectedPresetIndex <= 0}
                    onClick={() => movePreset(-1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="preset-icon-action"
                    aria-label="Move preset down"
                    disabled={selectedPresetIndex < 0 || selectedPresetIndex >= presets.length - 1}
                    onClick={() => movePreset(1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              )}
            </div>

            <label className="preset-field">
              <span>Name</span>
              <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Clean lyrics" />
            </label>

            <fieldset className="preset-kind-fieldset">
              <legend>Type</legend>
              <div className="preset-kind-options">
                <button
                  type="button"
                  className={kind === 'chain' ? 'is-active' : ''}
                  aria-pressed={kind === 'chain'}
                  onClick={() => setKind('chain')}
                >
                  <Settings2 size={15} />
                  <span>Command sequence<small>Run several commands in order</small></span>
                </button>
                <button
                  type="button"
                  className={kind === 'regex' ? 'is-active' : ''}
                  aria-pressed={kind === 'regex'}
                  onClick={() => setKind('regex')}
                >
                  <span className="preset-replace-icon">Aa</span>
                  <span>Find & replace<small>Replace text using a search pattern</small></span>
                </button>
              </div>
            </fieldset>

            {kind === 'chain' ? (
              <div className="preset-config-section">
                <div className="preset-add-command">
                  <label className="preset-field">
                    <span>Add command</span>
                    <select value={commandToAdd} onChange={event => setCommandToAdd(event.target.value as CommandId)}>
                      {(['Text', 'Suno', 'Symbols'] as const).map(group => (
                        <optgroup label={group} key={group}>
                          {PRESET_COMMAND_OPTIONS.filter(option => option.group === group).map(option => (
                            <option value={option.id} key={option.id}>{option.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="preset-secondary-button" onClick={() => setCommands([...commands, commandToAdd])}>
                    Add
                  </button>
                </div>
                <ol className="preset-command-list">
                  {commands.map((commandId, index) => (
                    <li key={`${commandId}-${index}`}>
                      <span className="preset-command-index">{index + 1}</span>
                      <span>{getPresetCommandLabel(commandId)}</span>
                      <div>
                        <button type="button" aria-label={`Move command ${index + 1} up`} disabled={index === 0} onClick={() => moveCommand(index, -1)}><ArrowUp size={15} /></button>
                        <button type="button" aria-label={`Move command ${index + 1} down`} disabled={index === commands.length - 1} onClick={() => moveCommand(index, 1)}><ArrowDown size={15} /></button>
                        <button type="button" aria-label={`Remove command ${index + 1}`} onClick={() => setCommands(commands.filter((_, commandIndex) => commandIndex !== index))}><X size={15} /></button>
                      </div>
                    </li>
                  ))}
                  {commands.length === 0 && <li className="preset-command-empty">Add commands in the order they should run.</li>}
                </ol>
              </div>
            ) : (
              <div className="preset-config-section preset-replace-fields">
                <label className="preset-field">
                  <span>Find pattern</span>
                  <input aria-label="Find pattern" value={pattern} onChange={event => setPattern(event.target.value)} placeholder="e.g. hello" />
                  <small>Regular expressions are supported.</small>
                </label>
                <label className="preset-field">
                  <span>Replace with</span>
                  <input aria-label="Replace with" value={replacement} onChange={event => setReplacement(event.target.value)} placeholder="e.g. world" />
                </label>
                <div className="preset-checks">
                  <label><input type="checkbox" checked={replaceAll} onChange={event => setReplaceAll(event.target.checked)} /> Replace all</label>
                  <label><input type="checkbox" checked={ignoreCase} onChange={event => setIgnoreCase(event.target.checked)} /> Ignore case</label>
                </div>
              </div>
            )}

            <div className="preset-form-footer">
              <div className="preset-form-message" aria-live="polite">
                {error && <span className="is-error">{error}</span>}
                {!error && savedMessage && <span>{savedMessage}</span>}
              </div>
              <div className="preset-form-actions">
                {editingId !== null && (
                  <button type="button" className={`preset-delete-button ${confirmDelete ? 'is-confirming' : ''}`} onClick={deletePreset}>
                    <Trash2 size={15} /> {confirmDelete ? 'Confirm delete' : 'Delete'}
                  </button>
                )}
                <button type="button" className="preset-primary-button" onClick={savePreset}>Save preset</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
