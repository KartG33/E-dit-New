import type { Preset, PresetShortcut, PresetStep } from '../db';
import { COMMAND_REGISTRY } from '@core/commands/registry';
import { toSequence } from '@core/presets/model';

export interface PresetForm { name: string; steps: PresetStep[]; shortcut?: PresetShortcut }
interface Draft { base: string | null; form: PresetForm }
export const presetForm = (preset?: Preset): PresetForm => preset
  ? { name: preset.name, steps: toSequence(preset.data).steps, shortcut: preset.shortcut }
  : { name: '', steps: [] };
export const presetDraftBase = (preset?: Preset) => preset
  ? JSON.stringify([preset.createdAt, presetForm(preset)]) : null;

const isForm = (value: unknown): value is PresetForm => {
  if (!value || typeof value !== 'object') return false;
  const form = value as PresetForm;
  if (typeof form.name !== 'string' || !Array.isArray(form.steps)) return false;
  if (form.shortcut && (typeof form.shortcut.code !== 'string'
    || !['ctrl', 'shift', 'alt', 'meta'].every(key => typeof form.shortcut?.[key as keyof PresetShortcut] === 'boolean'))) return false;
  return form.steps.every(step => {
    if (!step || typeof step !== 'object') return false;
    if (step.type === 'command') return Object.hasOwn(COMMAND_REGISTRY, step.command);
    if (step.type === 'replace') return typeof step.pattern === 'string' && typeof step.replacement === 'string'
      && typeof step.regex === 'boolean' && typeof step.flags === 'string';
    return step.type === 'remove' && Array.isArray(step.fragments) && step.fragments.every(part => typeof part === 'string');
  });
};

/** Local, unfinished forms are separate from executable/exported presets. */
export class PresetDraftStore {
  private prefix: string;
  constructor(databaseName: string) { this.prefix = `edit.preset-draft.${databaseName}.`; }
  private key(id: number | null) { return `${this.prefix}${id ?? 'new'}`; }
  read(id: number | null, base: string | null): PresetForm | undefined {
    const raw = localStorage.getItem(this.key(id));
    if (!raw) return;
    let draft: Draft | undefined;
    try { draft = JSON.parse(raw) as Draft; } catch { /* Discard damaged local drafts. */ }
    if (!draft || draft.base !== base || !isForm(draft.form)) { this.clear(id); return; }
    return draft.form;
  }
  write(id: number | null, base: string | null, form: PresetForm) {
    localStorage.setItem(this.key(id), JSON.stringify({ base, form }));
    localStorage.setItem(`${this.prefix}last`, JSON.stringify(id));
  }
  last(): number | null | undefined {
    const raw = localStorage.getItem(`${this.prefix}last`);
    if (raw === null) return;
    try {
      const id: unknown = JSON.parse(raw);
      return id === null || (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) ? id : undefined;
    } catch { return; }
  }
  clear(id: number | null) {
    localStorage.removeItem(this.key(id));
    if (this.last() === id) localStorage.removeItem(`${this.prefix}last`);
  }
}
