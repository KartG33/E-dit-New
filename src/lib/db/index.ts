import Dexie, { type Table } from 'dexie';

export interface Note {
  id?: number;
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryRecord {
  id?: number;
  text: string;
  editorId: 'left' | 'right' | 'main';
  timestamp: number;
}

export interface ChainPreset {
  type: 'chain';
  commands: string[];
}

export interface RegexPreset {
  type: 'regex';
  pattern: string;
  flags: string;
  replacement: string;
}

export type PresetData = ChainPreset | RegexPreset;

export interface Preset {
  id?: number;
  name: string;
  data: PresetData;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number; // Added in v2
}

// typed settings map
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  dualMode: boolean;
  activeEditor: 'left' | 'right' | 'main';
  startupTab: 'Commands' | 'Suno' | 'Presets' | 'Favorites';
}

export interface Setting {
  key: string;
  value: any;
}

export class EditDatabase extends Dexie {
  notes!: Table<Note, number>;
  history!: Table<HistoryRecord, number>;
  presets!: Table<Preset, number>;
  settings!: Table<Setting, string>;

  constructor(dbName: string = 'EditDatabase') {
    super(dbName);

    // Version 1 Schema
    this.version(1).stores({
      notes: '++id, title, *tags, createdAt, updatedAt',
      history: '++id, editorId, timestamp',
      presets: '++id, name, isFavorite, createdAt', // no updatedAt in V1 indexing (it doesn't need indexing anyway, but just for the sake of schema)
      settings: 'key'
    });

    // Version 2 Schema (Migration example: adding updatedAt to presets if missing)
    this.version(2).stores({
      notes: '++id, title, *tags, createdAt, updatedAt',
      history: '++id, editorId, timestamp',
      presets: '++id, name, isFavorite, createdAt, updatedAt',
      settings: 'key'
    }).upgrade(trans => {
      return trans.table('presets').toCollection().modify((preset: Preset) => {
        if (!preset.updatedAt) {
          preset.updatedAt = preset.createdAt || Date.now();
        }
      });
    });
  }

  // Method to add to history and enforce the limit per editor (max 50)
  async addHistory(record: Omit<HistoryRecord, 'id'>, maxRecords: number = 50) {
    await this.transaction('rw', this.history, async () => {
      await this.history.add(record);
      const count = await this.history.where('editorId').equals(record.editorId).count();
      if (count > maxRecords) {
        const oldest = await this.history
          .where('editorId')
          .equals(record.editorId)
          .sortBy('timestamp');
        const toDelete = oldest.slice(0, count - maxRecords).map(r => r.id!);
        await this.history.bulkDelete(toDelete);
      }
    });
  }

  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K] | undefined> {
    const setting = await this.settings.get(key);
    return setting?.value as AppSettings[K];
  }

  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.settings.put({ key, value });
  }
}

export const db = new EditDatabase();
