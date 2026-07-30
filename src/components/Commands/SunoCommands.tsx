import { useEffect, useId, useState } from 'react';
import { Tags, X } from 'lucide-react';
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
  activeEditor: 'left' | 'right';
  editorText: string;
  insertTag: (tag: string) => void;
}

export const SunoCommands = ({ applyCommand, activeEditor, editorText, insertTag }: SunoCommandsProps) => {
  const [tagsOpen, setTagsOpen] = useState(false);
  const tagsPanelId = useId();

  useEffect(() => {
    if (!tagsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTagsOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [tagsOpen]);

  return (
    <>
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
          aria-controls={tagsPanelId}
          onClick={() => setTagsOpen((isOpen) => !isOpen)}
        >
          <Tags size={13} />
          Tags
        </button>
      </div>

      {tagsOpen && (
        <aside
          id={tagsPanelId}
          className={`tags-popover is-opposite-${activeEditor}`}
          role="dialog"
          aria-labelledby={`${tagsPanelId}-title`}
        >
          <div className="tags-popover-header">
            <h2 id={`${tagsPanelId}-title`} className="tags-popover-title">Suno Tags</h2>
            <button
              type="button"
              className="tags-popover-close"
              aria-label="Close Tags"
              onClick={() => setTagsOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <SunoTagsEditor
            key={activeEditor}
            editorText={editorText}
            onInsert={insertTag}
            onChangeText={applyCommand}
          />
        </aside>
      )}
    </>
  );
};
