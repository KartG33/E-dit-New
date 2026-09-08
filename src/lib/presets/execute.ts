import type { PresetData, RegexPreset, ChainPreset } from '../db';
import { COMMAND_REGISTRY, type CommandId } from '../commands/registry';
import { toSequence, validateSteps } from './model';
import { removeAllExact } from '../textExactEdit';

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
    if (!Object.hasOwn(COMMAND_REGISTRY, cmdId) || !fn) {
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
  } else if (preset.type === 'sequence') {
    const { steps } = toSequence(preset);
    validateSteps(steps);
    return steps.reduce((result, step) => {
      if (step.type === 'command') return COMMAND_REGISTRY[step.command](result);
      if (step.type === 'remove') return removeAllExact(result, step.fragments);
      if (step.regex) return result.replace(new RegExp(step.pattern, step.flags), step.replacement);
      const escaped = step.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return result.replace(new RegExp(escaped, step.flags), () => step.replacement);
    }, text);
  }
  return text;
};
