import type { CommandId } from './commands/registry';

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

export type PresetStep =
  | { type: 'command'; command: CommandId }
  | { type: 'replace'; pattern: string; replacement: string; regex: boolean; flags: string }
  | { type: 'remove'; fragments: string[] };
export interface SequencePreset { type: 'sequence'; steps: PresetStep[] }
export type PresetData = ChainPreset | RegexPreset | SequencePreset;

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
  lastTab: 'standard' | 'suno' | 'presets';
  actionShortcuts: Record<string, PresetShortcut | null>;
  editorLeftText: string;
  editorRightText: string;
  favoriteCommandIds: string[];
}

export interface Setting {
  key: string;
  value: unknown;
}

