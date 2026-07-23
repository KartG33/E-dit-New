import type { RegexPreset } from '../db';

export const applyRegexPreset = (text: string, preset: RegexPreset): string => {
  try {
    const regex = new RegExp(preset.pattern, preset.flags);
    return text.replace(regex, preset.replacement);
  } catch {
    throw new Error('Invalid regular expression');
  }
};
