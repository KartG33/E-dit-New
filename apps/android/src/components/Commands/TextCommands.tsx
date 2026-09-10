import { sunoTrim } from '@core/commands/suno';
import {
  addSpaceAfterPunctuation,
  collapseSpaces,
  inline,
  inlineComma,
  line1,
  lineX,
  lower,
  removeSpaceBeforePunctuation,
  sentence,
  toUpperCase,
  trimLines,
} from '@core/commands/text';
import { CommandButton } from './CommandButton';

interface TextCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
}

export const TextCommands = ({ applyCommand }: TextCommandsProps) => (
  <div className="ui-command-row">
    <CommandButton label="Trim" actionId="suno.trim" onClick={() => applyCommand(sunoTrim)} />
    <CommandButton label="Spaces" actionId="text.spaces" onClick={() => applyCommand(collapseSpaces)} />
    <CommandButton label="Edges" actionId="text.edges" onClick={() => applyCommand(trimLines)} />
    <CommandButton label="Upper" actionId="text.upper" onClick={() => applyCommand(toUpperCase)} />
    <CommandButton label="Lower" actionId="text.lower" onClick={() => applyCommand(lower)} />
    <CommandButton label="Sentence" actionId="text.sentence" onClick={() => applyCommand(sentence)} />
    <CommandButton label="Line 1" actionId="text.line1" onClick={() => applyCommand(line1)} />
    <CommandButton label="Line X" actionId="text.lineX" onClick={() => applyCommand(lineX)} />
    <CommandButton label="Inline ," actionId="text.inlineComma" onClick={() => applyCommand(inlineComma)} />
    <CommandButton label="Inline" actionId="text.inline" onClick={() => applyCommand(inline)} />
    <CommandButton label="- Space Punct" actionId="text.removeSpaceBeforePunctuation" onClick={() => applyCommand(removeSpaceBeforePunctuation)} />
    <CommandButton label="+ Space Punct" actionId="text.addSpaceAfterPunctuation" onClick={() => applyCommand(addSpaceAfterPunctuation)} />
  </div>
);
