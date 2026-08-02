import * as textCmds from './text';
import * as sunoCmds from './suno';
import { SYMBOL_COMMAND_REGISTRY, type SymbolCommandId } from './symbols';

const BASE_COMMAND_REGISTRY = {
  'text.spaces': textCmds.collapseSpaces,
  'text.edges': textCmds.trimLines,
  'text.upper': textCmds.toUpperCase,
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
  'suno.upper': sunoCmds.capitalizeSunoLines,
  'suno.lyrics': sunoCmds.lyrics,
  'suno.structure': sunoCmds.structure,
  'suno.trim': sunoCmds.sunoTrim,
} as const;

export type BaseCommandId = keyof typeof BASE_COMMAND_REGISTRY;
export type CommandId = BaseCommandId | SymbolCommandId;

export const COMMAND_REGISTRY: Record<CommandId, (text: string) => string> = {
  ...BASE_COMMAND_REGISTRY,
  ...SYMBOL_COMMAND_REGISTRY,
};
