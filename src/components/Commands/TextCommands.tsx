import { trim as sunoTrim } from '../../lib/commands/suno';
import {
  addSpaceAfterPunctuation,
  edges,
  inline,
  inlineComma,
  line1,
  lineX,
  lower,
  removeSpaceBeforePunctuation,
  sentence,
  spaces,
  upper,
} from '../../lib/commands/text';
import { CommandButton } from './CommandButton';

interface TextCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
}

export const TextCommands = ({ applyCommand }: TextCommandsProps) => (
  <div className="flex flex-wrap items-center gap-1.5 w-full">
    <CommandButton label="Trim" onClick={() => applyCommand(sunoTrim)} />
    <CommandButton label="Spaces" onClick={() => applyCommand(spaces)} />
    <CommandButton label="Edges" onClick={() => applyCommand(edges)} />
    <CommandButton label="Upper" onClick={() => applyCommand(upper)} />
    <CommandButton label="Lower" onClick={() => applyCommand(lower)} />
    <CommandButton label="Sentence" onClick={() => applyCommand(sentence)} />
    <CommandButton label="Line 1" onClick={() => applyCommand(line1)} />
    <CommandButton label="Line X" onClick={() => applyCommand(lineX)} />
    <CommandButton label="Inline ," onClick={() => applyCommand(inlineComma)} />
    <CommandButton label="Inline" onClick={() => applyCommand(inline)} />
    <CommandButton label="- Space Punct" onClick={() => applyCommand(removeSpaceBeforePunctuation)} />
    <CommandButton label="+ Space Punct" onClick={() => applyCommand(addSpaceAfterPunctuation)} />
  </div>
);
