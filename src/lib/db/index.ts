import Dexie, { type Table } from 'dexie';
import type { CommandId } from '../commands/registry';

const MAX_HISTORY_RECORDS_PER_EDITOR = 50;

export interface HistoryRecord {
  id?: number;
  text: string;
  editorId: 'left' | 'right';
  timestamp: number;
}

export interface ChainPreset {
  type: 'chain';
  commands: CommandId[];
}

export interface RegexPreset {
  type: 'regex';
  pattern: string;
  flags: string;
  replacement: string;
}

export type PresetData = ChainPreset | RegexPreset;

export interface PresetShortcut {
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface Preset {
  id?: number;
  name: string;
  data: PresetData;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number; // Added in v2
  order?: number; // Added in v3
  shortcut?: PresetShortcut;
}

// typed settings map
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  dualMode: boolean;
  activeEditor: 'left' | 'right';
  startupTab: 'Commands' | 'Suno' | 'Presets' | 'Favorites';
  editorLeftText: string;
  editorRightText: string;
  favoriteCommandIds: string[];
}

export interface Setting {
  key: string;
  value: unknown;
}

export class EditDatabase extends Dexie {
  history!: Table<HistoryRecord, number>;
  presets!: Table<Preset, number>;
  settings!: Table<Setting, string>;

  constructor(dbName: string = 'EditDatabase') {
    super(dbName);

    // Version 1 Schema
    this.version(1).stores({
      notes: '++id, title, *tags, createdAt, updatedAt',
      history: '++id, editorId, timestamp',
      presets: '++id, name, isFavorite, createdAt',
      settings: 'key'
    });

    // Version 2 Schema
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

    // Version 3 Schema
    this.version(3).stores({
      notes: '++id, title, *tags, createdAt, updatedAt',
      history: '++id, editorId, timestamp',
      presets: '++id, name, isFavorite, createdAt, updatedAt, order',
      settings: 'key'
    }).upgrade(trans => {
      let currentOrder = 0;
      return trans.table('presets').toCollection().modify((preset: Preset) => {
        if (typeof preset.order !== 'number') {
          preset.order = currentOrder++;
        }
      });
    });

    // Version 4 Schema
    this.version(4).stores({
      notes: null
    });
  }

  async addHistory(record: Omit<HistoryRecord, 'id'>): Promise<void> {
    await this.transaction('rw', this.history, async () => {
      const records = await this.history
        .where('editorId')
        .equals(record.editorId)
        .sortBy('timestamp');
      const latestRecord = records[records.length - 1];

      if (latestRecord?.text === record.text) {
        return;
      }

      await this.history.add(record);
      if (records.length + 1 > MAX_HISTORY_RECORDS_PER_EDITOR) {
        const recordsAfterInsert = await this.history
          .where('editorId')
          .equals(record.editorId)
          .sortBy('timestamp');
        const toDelete = recordsAfterInsert
          .slice(0, recordsAfterInsert.length - MAX_HISTORY_RECORDS_PER_EDITOR)
          .map(historyRecord => historyRecord.id!);
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
