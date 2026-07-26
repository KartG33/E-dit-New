import * as textCmds from './text';
import * as sunoCmds from './suno';

export const COMMAND_REGISTRY = {
  'text.spaces': textCmds.spaces,
  'text.edges': textCmds.edges,
  'text.upper': textCmds.upper,
  'text.lower': textCmds.lower,
  'text.sentence': textCmds.sentence,
  'text.removeSpaceBeforePunctuation': textCmds.removeSpaceBeforePunctuation,
  'text.addSpaceAfterPunctuation': textCmds.addSpaceAfterPunctuation,
  'text.line1': textCmds.line1,
  'text.lineX': textCmds.lineX,
  'text.inline': textCmds.inline,
  'text.inlineComma': textCmds.inlineComma,
  'suno.clean': sunoCmds.clean,
  'suno.space': sunoCmds.space,
  'suno.upper': sunoCmds.upper,
  'suno.lyrics': sunoCmds.lyrics,
  'suno.structure': sunoCmds.structure,
  'suno.trim': sunoCmds.trim,
} as const;

export type CommandId = keyof typeof COMMAND_REGISTRY;