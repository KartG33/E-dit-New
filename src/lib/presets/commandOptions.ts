import type { CommandId } from '../commands/registry';

export interface PresetCommandOption {
  id: CommandId;
  label: string;
  group: 'Text' | 'Suno';
}

export const PRESET_COMMAND_OPTIONS: readonly PresetCommandOption[] = [
  { id: 'text.spaces', label: 'Spaces', group: 'Text' },
  { id: 'text.edges', label: 'Edges', group: 'Text' },
  { id: 'text.upper', label: 'Upper', group: 'Text' },
  { id: 'text.lower', label: 'Lower', group: 'Text' },
  { id: 'text.sentence', label: 'Sentence', group: 'Text' },
  { id: 'text.removeSpaceBeforePunctuation', label: '- Space Punct', group: 'Text' },
  { id: 'text.addSpaceAfterPunctuation', label: '+ Space Punct', group: 'Text' },
  { id: 'text.line1', label: 'Line 1', group: 'Text' },
  { id: 'text.lineX', label: 'Line X', group: 'Text' },
  { id: 'text.inline', label: 'Inline', group: 'Text' },
  { id: 'text.inlineComma', label: 'Inline ,', group: 'Text' },
  { id: 'suno.clean', label: 'Suno Clean', group: 'Suno' },
  { id: 'suno.space', label: 'Suno Space', group: 'Suno' },
  { id: 'suno.upper', label: 'Suno Upper', group: 'Suno' },
  { id: 'suno.lyrics', label: 'Suno Lyrics', group: 'Suno' },
  { id: 'suno.structure', label: 'Suno Structure', group: 'Suno' },
  { id: 'suno.trim', label: 'Trim', group: 'Suno' },
];

export const getPresetCommandLabel = (commandId: CommandId) =>
  PRESET_COMMAND_OPTIONS.find(option => option.id === commandId)?.label ?? commandId;
