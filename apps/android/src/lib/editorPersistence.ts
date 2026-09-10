import { db } from './db';
import { notify } from './notifications';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';
export const DATA_IMPORTED = 'app-data-imported';
const controllers = new Set<EditorPersistence>();
const writes = new Set<Promise<void>>();
let importing = false;
export const isDataImporting = () => importing;
export const waitForEditorWrites = async () => { await Promise.allSettled([...writes]); };
export const flushEditors = async () => { await Promise.all([...controllers].map(editor => editor.flush())); };

export async function importWithEditors(importer: () => Promise<void>) {
  if (importing) throw new Error('Another import is running');
  importing = true;
  window.dispatchEvent(new Event('app-data-busy'));
  try {
    await flushEditors();
    await importer();
    for (const editor of controllers) editor.clearRecovery();
    window.dispatchEvent(new Event(DATA_IMPORTED));
  } finally {
    importing = false;
    window.dispatchEvent(new Event('app-data-busy'));
  }
}

/** A synchronous recovery journal bridges edits and debounced IndexedDB writes. */
export class EditorPersistence {
  private revision = 0;
  private savedRevision = 0;
  private text = '';
  private history = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writing: Promise<void> | undefined;
  private listeners = new Set<(status: SaveStatus) => void>();
  status: SaveStatus = 'saved';
  readonly key: 'editorLeftText' | 'editorRightText';
  readonly recoveryKey: string;
  readonly editorId: 'left' | 'right';

  constructor(editorId: 'left' | 'right') {
    this.editorId = editorId;
    this.key = editorId === 'left' ? 'editorLeftText' : 'editorRightText';
    this.recoveryKey = `edit.recovery.${db.name}.${editorId}`;
  }
  subscribe(listener: (status: SaveStatus) => void) {
    this.listeners.add(listener);
    listener(this.status);
    return () => { this.listeners.delete(listener); };
  }
  register() {
    controllers.add(this);
    return () => { controllers.delete(this); };
  }
  private setStatus(status: SaveStatus) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }
  clearRecovery() {
    localStorage.removeItem(this.recoveryKey);
  }
  recover(fallback: string): string {
    let raw: string | null;
    try { raw = localStorage.getItem(this.recoveryKey); }
    catch { notify('Recovery storage is unavailable; loaded the saved editor text.', true); return fallback; }
    if (raw === null) return fallback;
    let record: unknown;
    try { record = JSON.parse(raw); }
    catch { notify('Recovery data is invalid; loaded the saved editor text.', true); return fallback; }
    if (!record || typeof record !== 'object' || !('text' in record) || typeof record.text !== 'string') {
      notify('Recovery data is invalid; loaded the saved editor text.', true);
      return fallback;
    }
    this.update(record.text, 'history' in record && record.history === true);
    return record.text;
  }
  update(text: string, history = true) {
    this.text = text;
    this.history = history;
    this.revision++;
    this.setStatus('pending');
    try {
      localStorage.setItem(this.recoveryKey, JSON.stringify({ text, history }));
    } catch {
      this.setStatus('error');
      notify('Recovery storage is unavailable. Keep the app open until the text is saved.', true);
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => undefined); }, 2000);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.writing) {
      await this.writing;
      return this.flush();
    }
    if (this.savedRevision === this.revision) return;
    const revision = this.revision;
    const text = this.text;
    const history = this.history;
    this.setStatus('saving');
    const write = (async () => {
      try {
        await db.setSetting(this.key, text);
        if (history) await db.addHistory({ editorId: this.editorId, text, timestamp: Date.now() });
        if (this.revision === revision) {
          // Only remove the journal belonging to this write, never a newer edit.
          const raw = localStorage.getItem(this.recoveryKey);
          if (raw === JSON.stringify({ text, history })) this.clearRecovery();
          this.setStatus('saved');
        }
        this.savedRevision = revision;
      } catch (error) {
        this.setStatus('error');
        notify(`Failed to save ${this.editorId} editor. Retry saving.`, true);
        throw error;
      }
    })();
    this.writing = write;
    writes.add(write);
    try { await write; }
    finally { this.writing = undefined; writes.delete(write); }
    if (this.savedRevision !== this.revision) await this.flush();
  }
}
