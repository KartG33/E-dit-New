import type { PresetData, RegexPreset, ChainPreset } from '../db';
import { COMMAND_REGISTRY, type CommandId } from '../commands/registry';

export const applyRegexPreset = (text: string, preset: RegexPreset): string => {
  try {
    const regex = new RegExp(preset.pattern, preset.flags);
    return text.replace(regex, preset.replacement);
  } catch {
    throw new Error('Invalid regular expression');
  }
};

export const applyChainPreset = (text: string, preset: ChainPreset): string => {
  let result = text;
  for (const cmdId of preset.commands) {
    const fn = COMMAND_REGISTRY[cmdId as CommandId];
    if (!fn) {
      throw new Error(`Unknown CommandId: ${cmdId}`);
    }
    result = fn(result);
  }
  return result;
};

export const applyPreset = (text: string, preset: PresetData): string => {
  if (preset.type === 'regex') {
    return applyRegexPreset(text, preset);
  } else if (preset.type === 'chain') {
    return applyChainPreset(text, preset);
  }
  return text;
};