import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Trash2, X } from 'lucide-react';
import { db, type EditDatabase, type Preset, type PresetShortcut, type PresetStep } from '../../lib/db';
import { usePresets } from '../../hooks/usePresets';
import { useDialog } from '../../hooks/useDialog';
import { ANDROID_BACK_REQUEST_EVENT } from '../../hooks/useAndroidAppLifecycle';
import { shortcutId, validatePresetShortcut } from '../../lib/hotkeys';
import { toSequence, validateSteps } from '@core/presets/model';
import { PresetList } from './PresetList';
import { PresetStepsEditor } from './PresetStepsEditor';
import { ShortcutRecorder } from '../Shortcuts/ShortcutRecorder';
import { useActionShortcuts } from '../../hooks/useActionShortcuts';
import { shortcutConflict } from '../../lib/actionShortcuts';
import { PresetDraftStore, presetDraftBase, presetForm, type PresetForm } from '../../lib/presets/drafts';
import { notify } from '../../lib/notifications';

interface Props { onClose: () => void; onBack?: () => void; database?: EditDatabase }
export const PresetManager = ({ onClose, onBack, database = db }: Props) => {
  const { presets, isLoading } = usePresets(database);
  const { overrides } = useActionShortcuts(database);
  const initialized = useRef(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PresetForm>(() => presetForm());
  const { name, steps, shortcut } = form;
  const formRef = useRef(form);
  const baseRef = useRef<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const drafts = useMemo(() => new PresetDraftStore(database.name), [database]);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { dialogRef, backdropProps } = useDialog(() => { if (!busy) onClose(); });

  const accessDraftStorage = <T,>(operation: () => T, fallback: T): T => {
    try { return operation(); }
    catch { notify('Could not access the preset draft. Keep this window open and save your changes.', true); return fallback; }
  };
  const showForm = (next: PresetForm) => { formRef.current = next; setForm(next); };
  const edit = (patch: Partial<PresetForm>) => {
    const next = { ...formRef.current, ...patch };
    showForm(next); setHasDraft(true); setMessage('');
    accessDraftStorage(() => drafts.write(editingId, baseRef.current, next), undefined);
  };
  const setName = (value: string) => edit({ name: value });
  const setSteps = (value: PresetStep[]) => edit({ steps: value });
  const setShortcut = (value: PresetShortcut | undefined) => edit({ shortcut: value });
  const reset = () => {
    initialized.current = true;
    const draft = accessDraftStorage(() => drafts.read(null, null), undefined);
    setEditingId(null); baseRef.current = null; showForm(draft ?? presetForm()); setHasDraft(!!draft);
    setError(''); setMessage(''); setConfirmDelete(false); setMobileView('editor');
  };
  const load = (preset: Preset, showEditor = true) => {
    initialized.current = true;
    const base = presetDraftBase(preset);
    const draft = accessDraftStorage(() => drafts.read(preset.id ?? null, base), undefined);
    setEditingId(preset.id ?? null); baseRef.current = base; showForm(draft ?? presetForm(preset));
    setHasDraft(!!draft); setError(''); setMessage(''); setConfirmDelete(false);
    if (showEditor) setMobileView('editor');
  };
  const discard = () => {
    accessDraftStorage(() => drafts.clear(editingId), undefined);
    const saved = presets.find(item => item.id === editingId);
    baseRef.current = presetDraftBase(saved); showForm(presetForm(saved));
    setHasDraft(false); setError(''); setMessage('Changes discarded.');
  };
  useEffect(() => {
    if (isLoading || initialized.current) return;
    initialized.current = true;
    const last = accessDraftStorage(() => drafts.last(), undefined);
    if (last === null) { reset(); return; }
    const preset = presets.find(item => item.id === last);
    if (preset) { load(preset); return; }
    if (last !== undefined) accessDraftStorage(() => drafts.clear(last), undefined);
    if (presets.length) load(presets[0], false);
  });
  const goBack = () => {
    if (busy) return;
    if (mobileView === 'editor') setMobileView('list'); else onBack?.();
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !busy) onClose(); };
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      if (busy) { event.preventDefault(); return; }
      if (mobileView === 'editor') { event.preventDefault(); setMobileView('list'); }
      else if (onBack) { event.preventDefault(); onBack(); }
    };
    document.addEventListener('keydown', escape);
    window.addEventListener(ANDROID_BACK_REQUEST_EVENT, back);
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener(ANDROID_BACK_REQUEST_EVENT, back); };
  }, [onClose, onBack, mobileView, busy]);

  const validateShortcut = (value: PresetShortcut) => {
    const invalid = validatePresetShortcut(value);
    if (invalid) return invalid;
    return shortcutConflict(`preset:${editingId}`, value, overrides, presets);
  };
  const perform = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await operation(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save preset'); }
    finally { setBusy(false); }
  };
  const save = () => {
    const normalizedName = name.trim();
    if (!normalizedName) { setError('Enter a preset name.'); return; }
    if (!steps.length) { setError('Add at least one step.'); return; }
    if (presets.some(preset => preset.id !== editingId && preset.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      setError('A preset with this name already exists.'); return;
    }
    try { validateSteps(steps); }
    catch (failure) { setError((failure as Error).message); return; }
    if (shortcut) { const invalid = validateShortcut(shortcut); if (invalid) { setError(invalid); return; } }
    void perform(async () => {
      const now = Date.now();
      let savedId = editingId;
      await database.transaction('rw', database.presets, database.settings, async () => {
        const current = await database.presets.toArray();
        if (current.some(item => item.id !== editingId && item.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) throw new Error('A preset with this name already exists.');
        if (shortcut && current.some(item => item.id !== editingId && item.shortcut && shortcutId(item.shortcut) === shortcutId(shortcut))) throw new Error('This shortcut is already assigned.');
        if (shortcut) {
          const conflict = shortcutConflict(`preset:${editingId}`, shortcut, await database.getSetting('actionShortcuts') ?? {}, current);
          if (conflict) throw new Error(conflict);
        }
        const data = { type: 'sequence' as const, steps: structuredClone(steps) };
        if (editingId !== null) {
          const updated = await database.presets.update(editingId, { name: normalizedName, data, shortcut, updatedAt: now });
          if (!updated) throw new Error('This preset no longer exists.');
        } else {
          const id = await database.presets.add({ name: normalizedName, data, shortcut, isFavorite: false, createdAt: now, updatedAt: now, order: Math.max(-1, ...current.map(item => item.order ?? -1)) + 1 });
          savedId = id;
        }
      });
      accessDraftStorage(() => drafts.clear(editingId), undefined);
      const saved = await database.presets.get(savedId!);
      if (saved) { setEditingId(savedId); baseRef.current = presetDraftBase(saved); showForm(presetForm(saved)); }
      setHasDraft(false); setMessage('Saved.'); setConfirmDelete(false);
    });
  };
  const remove = () => {
    if (editingId === null) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    void perform(async () => {
      await database.presets.delete(editingId);
      accessDraftStorage(() => drafts.clear(editingId), undefined);
      const next = presets.find(item => item.id !== editingId);
      if (next) load(next, false); else reset();
      setMobileView('list');
    });
  };
  const duplicate = () => {
    if (editingId === null) return;
    void perform(async () => {
      await database.transaction('rw', database.presets, async () => {
        const current = await database.presets.toArray();
        const source = current.find(item => item.id === editingId);
        if (!source) throw new Error('This preset no longer exists.');
        let copyName = `${source.name} copy`; let number = 2;
        while (current.some(item => item.name.toLocaleLowerCase() === copyName.toLocaleLowerCase())) copyName = `${source.name} copy ${number++}`;
        const now = Date.now();
        const copy: Preset = { ...source, id: undefined, name: copyName, shortcut: undefined, data: toSequence(source.data), createdAt: now, updatedAt: now, order: Math.max(-1, ...current.map(item => item.order ?? -1)) + 1 };
        copy.id = await database.presets.add(copy);
        load(copy);
      });
      setMessage('Preset copied.');
    });
  };
  const selectedIndex = presets.findIndex(item => item.id === editingId);
  const move = (delta: number) => { void perform(async () => {
    const current = presets[selectedIndex]; const target = presets[selectedIndex + delta];
    if (!current || !target) return;
    await database.transaction('rw', database.presets, async () => {
      await database.presets.update(current.id!, { order: target.order ?? selectedIndex + delta });
      await database.presets.update(target.id!, { order: current.order ?? selectedIndex });
    });
  }); };

  return <div className="preset-manager-backdrop" data-testid="preset-manager-backdrop" {...backdropProps}>
    <section ref={dialogRef} className="preset-manager" role="dialog" aria-modal="true" aria-labelledby="preset-manager-title">
      <header className="preset-manager-header">{onBack && <button type="button" className="icon-button" aria-label={mobileView === 'editor' ? 'Back to preset list' : 'Back to Settings'} disabled={busy} onClick={goBack}><ArrowLeft size={18} /></button>}<div><h2 id="preset-manager-title">Presets</h2><p>Create and manage reusable text actions</p></div>
        <button className="icon-button window-close-button" aria-label="Close presets" disabled={busy} onClick={onClose}><X size={18} /></button>
      </header>
      <div className={`preset-manager-body is-mobile-${mobileView}`} data-testid="preset-manager-body">
        <PresetList presets={presets} disabled={busy} loading={isLoading} selected={editingId} onNew={reset} onSelect={load} />
        <div className="preset-manager-editor">
          <div className="preset-form-topline"><div className="preset-form-heading">
            {!onBack && <button className="preset-back-button" aria-label="Back to preset list" disabled={busy} onClick={goBack}><ArrowLeft size={18} /></button>}
            <h3>{editingId === null ? 'New preset' : 'Edit preset'}</h3>
          </div>{editingId !== null && <div className="preset-order-actions">
            <button className="preset-icon-action" aria-label="Duplicate preset" title="Create a copy" disabled={busy} onClick={duplicate}><Copy size={16} /></button>
            <button className="preset-icon-action" aria-label="Move preset up" disabled={busy || selectedIndex <= 0} onClick={() => move(-1)}><ArrowUp size={16} /></button>
            <button className="preset-icon-action" aria-label="Move preset down" disabled={busy || selectedIndex >= presets.length - 1} onClick={() => move(1)}><ArrowDown size={16} /></button>
          </div>}</div>
          <fieldset className="preset-edit-fields" disabled={busy}>
            <label className="preset-field"><span>Name</span><input value={name} onChange={event => { setName(event.target.value); setMessage(''); }} placeholder="e.g. Clean lyrics" /></label>
            <div className="preset-field"><span>Keyboard shortcut</span><ShortcutRecorder value={shortcut} onChange={setShortcut} validate={validateShortcut} onError={setError} /></div>
            <PresetStepsEditor steps={steps} onChange={value => { setSteps(value); setError(''); setMessage(''); }} />
          </fieldset>
          <div className="preset-form-footer"><div className="preset-form-message" aria-live="polite">
            {error ? <span className="is-error">{error}</span> : message ? <span>{message}</span> : hasDraft && <span>Draft</span>}
          </div><div className="preset-form-actions">
            {editingId !== null && <button className="preset-delete-button" disabled={busy} onClick={remove}><Trash2 size={15} />{confirmDelete ? 'Confirm delete' : 'Delete'}</button>}
            <button className="preset-secondary-button" disabled={busy || !hasDraft} onClick={discard}>Discard changes</button>
            <button className="preset-primary-button" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save preset'}</button>
          </div></div>
        </div>
      </div>
    </section>
  </div>;
};
