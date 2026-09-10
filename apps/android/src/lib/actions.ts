import { COMMAND_REGISTRY } from '@core/commands/registry';
import { PRESET_COMMAND_OPTIONS, getPresetCommandLabel } from '@core/presets/commandOptions';

export const BUILTIN_ACTIONS = [
  { id: 'editor.left', label: 'Switch to Editor 1', group: 'Navigation' },
  { id: 'editor.right', label: 'Switch to Editor 2', group: 'Navigation' },
  { id: 'layout.toggle', label: 'One / two editors', group: 'Navigation' },
  { id: 'open.history', label: 'History', group: 'Navigation' },
  { id: 'open.presets', label: 'Manage presets', group: 'Navigation' },
  { id: 'open.settings', label: 'Settings', group: 'Navigation' },
  { id: 'open.keys', label: 'Keyboard shortcuts', group: 'Navigation' },
  { id: 'tab.standard', label: 'Text tab', group: 'Navigation' },
  { id: 'tab.suno', label: 'Suno tab', group: 'Navigation' },
  { id: 'tab.presets', label: 'Presets tab', group: 'Navigation' },
  { id: 'open.data', label: 'Data', group: 'Navigation' },
  { id: 'open.tags', label: 'Suno Tags', group: 'Navigation' },
  { id: 'open.find', label: 'Find in text', group: 'Editor' },
  { id: 'open.replace', label: 'Find and edit', group: 'Editor' },
  { id: 'editor.copyOther', label: 'Copy to other editor', group: 'Editor' },
  { id: 'editor.undo', label: 'Undo', group: 'Editor' },
  { id: 'editor.redo', label: 'Redo', group: 'Editor' },
  { id: 'editor.copy', label: 'Copy all text', group: 'Editor' },
  { id: 'editor.paste', label: 'Paste', group: 'Editor' },
  { id: 'editor.clear', label: 'Clear editor', group: 'Editor' },
] as const;
export const ACTION_DEFINITIONS = [
  ...BUILTIN_ACTIONS.filter(action => action.id !== 'layout.toggle'),
  ...PRESET_COMMAND_OPTIONS.map(option => ({ ...option, label: getPresetCommandLabel(option.id), run: COMMAND_REGISTRY[option.id] })),
];
export const isBuiltinActionId = (id: string) => BUILTIN_ACTIONS.some(action => action.id === id) || Object.hasOwn(COMMAND_REGISTRY, id);
