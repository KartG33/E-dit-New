import {
  clean,
  lyrics,
  space,
  structure,
  capitalizeSunoLines,
} from '../../lib/commands/suno';
import { SunoTagsEditor } from '../SunoTags/SunoTagsEditor';
import { CommandButton } from './CommandButton';

interface SunoCommandsProps {
  applyCommand: (command: (text: string) => string) => void;
  editorText: string;
  insertText: (text: string) => void;
}

export const SunoCommands = ({ applyCommand, editorText, insertText }: SunoCommandsProps) => (
  <div className="ui-command-row">
    <CommandButton label="Suno Clean" onClick={() => applyCommand(clean)} />
    <CommandButton label="Suno Space" onClick={() => applyCommand(space)} />
    <CommandButton label="Suno Upper" onClick={() => applyCommand(capitalizeSunoLines)} />
    <CommandButton label="Suno Lyrics" onClick={() => applyCommand(lyrics)} />
    <CommandButton label="Suno Structure" onClick={() => applyCommand(structure)} />

    <div>
      <SunoTagsEditor editorText={editorText} onInsert={insertText} />
    </div>
  </div>
);
