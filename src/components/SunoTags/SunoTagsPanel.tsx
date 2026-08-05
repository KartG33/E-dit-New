import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SunoTagsEditor } from './SunoTagsEditor';

interface SunoTagsPanelProps {
  editorKey: 'left' | 'right';
  editorText: string;
  onInsert: (tag: string) => void;
  onChangeText: (command: (text: string) => string) => void;
  onClose: () => void;
}

export const SunoTagsPanel = ({
  editorKey,
  editorText,
  onInsert,
  onChangeText,
  onClose,
}: SunoTagsPanelProps) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <aside
      id="suno-tags-workspace"
      className="tags-docked-panel"
      role="dialog"
      aria-labelledby="suno-tags-title"
    >
      <header className="tags-docked-header">
        <div>
          <h2 id="suno-tags-title" className="tags-docked-title">Suno Tags</h2>
          <p className="tags-docked-description">Manage tags in the active text</p>
        </div>
        <button
          type="button"
          className="tags-docked-close window-close-button"
          aria-label="Close Tags"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <SunoTagsEditor
        key={editorKey}
        editorText={editorText}
        onInsert={onInsert}
        onChangeText={onChangeText}
      />
    </aside>
  );
};
