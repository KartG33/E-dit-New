import { useActions } from '../Shortcuts/ActionContext';
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
  const { title } = useActions();
  return (
    <div className="ui-command-row">
      <CommandButton label="Clean" actionId="suno.clean" onClick={() => applyCommand(clean)} />
      <CommandButton label="Space" actionId="suno.space" onClick={() => applyCommand(space)} />
      <CommandButton label="Upper" actionId="suno.upper" onClick={() => applyCommand(capitalizeSunoLines)} />
      <CommandButton label="Lyrics" actionId="suno.lyrics" onClick={() => applyCommand(lyrics)} />
      <CommandButton label="Structure" actionId="suno.structure" onClick={() => applyCommand(structure)} />
      <button
        type="button"
        className={`command-button tags-toggle ${tagsOpen ? 'is-active' : ''}`}
        aria-expanded={tagsOpen}
        aria-controls="suno-tags-workspace"
        title={title('open.tags', 'Tags')}
        onClick={() => onTagsOpenChange(!tagsOpen)}
      >
        <Tags size={13} />
        Tags
      </button>
    </div>
  );
};
