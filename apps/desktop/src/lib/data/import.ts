import { COMMAND_REGISTRY } from '@core/commands/registry';
import {
  db,
  type AppSettings,
  type EditDatabase,
  type Preset,
  type PresetShortcut,
  type Setting,
} from '../db';
import { shortcutId, validatePresetShortcut } from '../hotkeys';
import { toSequence, validateSteps } from '@core/presets/model';
import { isActionShortcuts, validateAllShortcuts, type ActionShortcuts } from '../actionShortcuts';

export const DATA_FILE_VERSION = 3;

export interface DataFileV3 {
  version: 3;
  presets: Preset[];
  settings: Setting[];
  timestamp: number;
}

export class DataImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataImportError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], path: string) => {
  const unknownKey = Object.keys(value).find(key => !allowed.includes(key));
  if (unknownKey) {
    throw new DataImportError(`${path} contains unknown field "${unknownKey}"`);
  }
};

function assertFiniteNumber(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DataImportError(`${path} must be a finite number`);
  }
}

function assertOptionalId(value: unknown, path: string): asserts value is number | undefined {
  if (value !== undefined && (!Number.isInteger(value) || (value as number) <= 0)) {
    throw new DataImportError(`${path} must be a positive integer`);
  }
}

const validatePreset = (value: unknown, index: number): Preset => {
  const path = `presets[${index}]`;
  if (!isRecord(value)) {
    throw new DataImportError(`${path} must be an object`);
  }

  assertExactKeys(value, ['id', 'name', 'data', 'isFavorite', 'createdAt', 'updatedAt', 'order', 'shortcut'], path);
  assertOptionalId(value.id, `${path}.id`);
  if (typeof value.name !== 'string') {
    throw new DataImportError(`${path}.name must be a string`);
  }
  if (typeof value.isFavorite !== 'boolean') {
    throw new DataImportError(`${path}.isFavorite must be a boolean`);
  }
  assertFiniteNumber(value.createdAt, `${path}.createdAt`);
  assertFiniteNumber(value.updatedAt, `${path}.updatedAt`);
  if (value.order !== undefined && (!Number.isInteger(value.order) || (value.order as number) < 0)) {
    throw new DataImportError(`${path}.order must be a non-negative integer`);
  }
  if (value.shortcut !== undefined) {
    if (!isRecord(value.shortcut)) {
      throw new DataImportError(`${path}.shortcut must be an object`);
    }
    assertExactKeys(value.shortcut, ['code', 'ctrl', 'shift', 'alt', 'meta'], `${path}.shortcut`);
    if (
      typeof value.shortcut.code !== 'string'
      || typeof value.shortcut.ctrl !== 'boolean'
      || typeof value.shortcut.shift !== 'boolean'
      || typeof value.shortcut.alt !== 'boolean'
      || typeof value.shortcut.meta !== 'boolean'
    ) {
      throw new DataImportError(`${path}.shortcut has invalid fields`);
    }
    const shortcutError = validatePresetShortcut(value.shortcut as unknown as PresetShortcut);
    if (shortcutError) {
      throw new DataImportError(`${path}.shortcut is invalid: ${shortcutError}`);
    }
  }
  if (!isRecord(value.data) || !['chain', 'regex', 'sequence'].includes(String(value.data.type))) {
    throw new DataImportError(`${path}.data must be a chain, regex or sequence preset`);
  }

  if (value.data.type === 'chain') {
    assertExactKeys(value.data, ['type', 'commands'], `${path}.data`);
    if (!Array.isArray(value.data.commands)) {
      throw new DataImportError(`${path}.data.commands must be an array`);
    }
    for (const [commandIndex, commandId] of value.data.commands.entries()) {
      if (typeof commandId !== 'string' || !Object.hasOwn(COMMAND_REGISTRY, commandId)) {
        throw new DataImportError(`${path}.data.commands[${commandIndex}] is not a known CommandId`);
      }
    }
  } else if (value.data.type === 'sequence') {
    assertExactKeys(value.data, ['type', 'steps'], `${path}.data`);
    try { validateSteps(value.data.steps); }
    catch (error) { throw new DataImportError(`${path}.data: ${(error as Error).message}`); }
  } else {
    assertExactKeys(value.data, ['type', 'pattern', 'flags', 'replacement'], `${path}.data`);
    if (
      typeof value.data.pattern !== 'string' ||
      typeof value.data.flags !== 'string' ||
      typeof value.data.replacement !== 'string'
    ) {
      throw new DataImportError(`${path}.data regex fields must be strings`);
    }
    try {
      new RegExp(value.data.pattern, value.data.flags);
    } catch {
      throw new DataImportError(`${path}.data contains an invalid regular expression`);
    }
  }

  return value as unknown as Preset;
};

const settingValidators: {
  [K in keyof AppSettings]: (value: unknown) => value is AppSettings[K];
} = {
  theme: (value): value is AppSettings['theme'] =>
    value === 'light' || value === 'dark' || value === 'system',
  dualMode: (value): value is boolean => typeof value === 'boolean',
  activeEditor: (value): value is AppSettings['activeEditor'] => value === 'left' || value === 'right',
  lastTab: (value): value is AppSettings['lastTab'] => value === 'standard' || value === 'suno' || value === 'presets',
  actionShortcuts: isActionShortcuts,
  startupTab: (value): value is AppSettings['startupTab'] =>
    value === 'Commands' || value === 'Suno' || value === 'Presets' || value === 'Favorites',
  editorLeftText: (value): value is string => typeof value === 'string',
  editorRightText: (value): value is string => typeof value === 'string',
  favoriteCommandIds: (value): value is string[] =>
    Array.isArray(value) && value.every(commandId =>
      typeof commandId === 'string' && Object.hasOwn(COMMAND_REGISTRY, commandId)
    ),
};

const validateSetting = (value: unknown, index: number): Setting => {
  const path = `settings[${index}]`;
  if (!isRecord(value)) {
    throw new DataImportError(`${path} must be an object`);
  }
  assertExactKeys(value, ['key', 'value'], path);
  if (typeof value.key !== 'string' || !Object.hasOwn(settingValidators, value.key)) {
    throw new DataImportError(`${path}.key is not a supported setting`);
  }

  const key = value.key as keyof AppSettings;
  if (!settingValidators[key](value.value)) {
    throw new DataImportError(`${path}.value is invalid for setting "${key}"`);
  }
  return { key, value: value.value };
};

export const parseDataFile = (text: string): DataFileV3 => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new DataImportError('File is not valid JSON');
  }

  if (!isRecord(value)) {
    throw new DataImportError('Data file must contain an object');
  }
  assertExactKeys(value, ['version', 'presets', 'settings', 'timestamp'], 'Data file');
  if (value.version !== 2 && value.version !== DATA_FILE_VERSION) {
    throw new DataImportError(`Unsupported Data version: ${String(value.version)}`);
  }
  if (!Array.isArray(value.presets)) {
    throw new DataImportError('presets must be an array');
  }
  if (!Array.isArray(value.settings)) {
    throw new DataImportError('settings must be an array');
  }
  assertFiniteNumber(value.timestamp, 'timestamp');

  const presets = value.presets.map(validatePreset);
  if (value.version === 2 && presets.some(preset => preset.data.type === 'sequence')) {
    throw new DataImportError('Sequence presets require Data version 3');
  }
  const settings = value.settings.map(validateSetting);
  const presetIds = presets.flatMap(preset => preset.id === undefined ? [] : [preset.id]);
  if (new Set(presetIds).size !== presetIds.length) {
    throw new DataImportError('presets contain duplicate ids');
  }
  const presetShortcutIds = presets.flatMap(preset => preset.shortcut ? [shortcutId(preset.shortcut)] : []);
  if (new Set(presetShortcutIds).size !== presetShortcutIds.length) {
    throw new DataImportError('presets contain duplicate keyboard shortcuts');
  }
  const settingKeys = settings.map(setting => setting.key);
  if (new Set(settingKeys).size !== settingKeys.length) {
    throw new DataImportError('settings contain duplicate keys');
  }
  const conflict = validateAllShortcuts((settings.find(setting => setting.key === 'actionShortcuts')?.value ?? {}) as ActionShortcuts, presets);
  if (conflict) throw new DataImportError(conflict);

  return { version: 3, presets: presets.map(preset => ({ ...preset, data: toSequence(preset.data) })), settings, timestamp: value.timestamp };
};

export const importDataFile = async (
  text: string,
  database: EditDatabase = db,
): Promise<void> => {
  const data = parseDataFile(text);
  await database.transaction('rw', database.presets, database.settings, async () => {
    await database.presets.clear();
    await database.presets.bulkAdd(data.presets);
    await database.settings.clear();
    await database.settings.bulkAdd(data.settings);
  });
};
