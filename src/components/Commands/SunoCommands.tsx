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
      <CommandButton label="Suno Clean" onClick={() => applyCommand(clean)} />
      <CommandButton label="Suno Space" onClick={() => applyCommand(space)} />
      <CommandButton label="Suno Upper" onClick={() => applyCommand(capitalizeSunoLines)} />
      <CommandButton label="Suno Lyrics" onClick={() => applyCommand(lyrics)} />
      <CommandButton label="Suno Structure" onClick={() => applyCommand(structure)} />
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
