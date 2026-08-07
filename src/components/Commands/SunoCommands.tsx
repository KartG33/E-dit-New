import { Tags } from 'lucide-react';
import {
  clean,
  lyrics,
  space,
  structure,
  capitalizeSunoLines,
} from '../../lib/commands/suno';
import { CommandButton } from './CommandButton';

interface SunoCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
  tagsOpen: boolean;
  onTagsOpenChange: (isOpen: boolean) => void;
}

export const SunoCommands = ({ applyCommand, tagsOpen, onTagsOpenChange }: SunoCommandsProps) => {
  return (
    <div className="ui-command-row">
      <CommandButton label="Clean" onClick={() => applyCommand(clean)} />
      <CommandButton label="Space" onClick={() => applyCommand(space)} />
      <CommandButton label="Upper" onClick={() => applyCommand(capitalizeSunoLines)} />
      <CommandButton label="Lyrics" onClick={() => applyCommand(lyrics)} />
      <CommandButton label="Structure" onClick={() => applyCommand(structure)} />
      <button
        type="button"
        className={`command-button tags-toggle ${tagsOpen ? 'is-active' : ''}`}
        aria-expanded={tagsOpen}
        aria-controls="suno-tags-workspace"
        onClick={() => onTagsOpenChange(!tagsOpen)}
      >
        <Tags size={13} />
        Tags
      </button>
    </div>
  );
};
