import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { removeAllExact, replaceAllExact } from '../../lib/textExactEdit';

type EditMode = 'replace' | 'remove';

interface QuickTextEditModalProps {
  editorId: 'left' | 'right';
  value: string;
  onApply: (value: string) => void;
  onClose: () => void;
}

const editorLabel = (editorId: 'left' | 'right') => editorId === 'left' ? 'Editor 1' : 'Editor 2';

export const QuickTextEditModal = ({ editorId, value, onApply, onClose }: QuickTextEditModalProps) => {
  const [mode, setMode] = useState<EditMode>('replace');
  const [search, setSearch] = useState('');
  const [replacement, setReplacement] = useState('');
  const [fragments, setFragments] = useState(['']);
  const [error, setError] = useState('');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const selectMode = (nextMode: EditMode) => {
    setMode(nextMode);
    setError('');
  };

  const setFragment = (index: number, fragment: string) => {
    setFragments(current => current.map((item, itemIndex) => itemIndex === index ? fragment : item));
    setError('');
  };

  const removeFragmentField = (index: number) => {
    setFragments(current => current.filter((_, itemIndex) => itemIndex !== index));
    setError('');
  };

  const handleApply = () => {
    const hasInput = mode === 'replace' ? search.length > 0 : fragments.some(fragment => fragment.length > 0);
    if (!hasInput) {
      setError(mode === 'replace' ? 'Enter text to find.' : 'Enter at least one fragment to remove.');
      return;
    }

    const nextValue = mode === 'replace'
      ? replaceAllExact(value, search, replacement)
      : removeAllExact(value, fragments);

    if (nextValue === value) {
      setError('No exact matches found.');
      return;
    }

    onApply(nextValue);
    onClose();
  };

  return (
    <div
      className="quick-edit-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="quick-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-title"
      >
        <header className="quick-edit-header">
          <div>
            <h2 id="quick-edit-title">Find &amp; edit</h2>
            <p>{editorLabel(editorId)} · exact matches · entire text</p>
          </div>
          <button
            type="button"
            className="icon-button window-close-button"
            aria-label="Close Find and edit"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="quick-edit-body">
          <div className="quick-edit-mode" aria-label="Operation">
            <button
              type="button"
              className={mode === 'replace' ? 'is-active' : ''}
              aria-pressed={mode === 'replace'}
              onClick={() => selectMode('replace')}
            >
              Replace
            </button>
            <button
              type="button"
              className={mode === 'remove' ? 'is-active' : ''}
              aria-pressed={mode === 'remove'}
              onClick={() => selectMode('remove')}
            >
              Remove
            </button>
          </div>

          {mode === 'replace' && (
            <div className="quick-edit-fields">
              <label className="quick-edit-field">
                <span>Find exact text</span>
                <input
                  autoFocus
                  aria-label="Find exact text"
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value);
                    setError('');
                  }}
                />
              </label>
              <label className="quick-edit-field">
                <span>Replace with</span>
                <input
                  aria-label="Replace with"
                  value={replacement}
                  onChange={event => setReplacement(event.target.value)}
                />
              </label>
              <p className="quick-edit-hint">Spaces, punctuation and letter case are matched exactly.</p>
            </div>
          )}

          {mode === 'remove' && (
            <div className="quick-edit-fields">
              {fragments.map((fragment, index) => (
                <label className="quick-edit-field" key={index}>
                  <span>Fragment {index + 1}</span>
                  <span className="quick-edit-input-row">
                    <input
                      autoFocus={index === 0}
                      aria-label={`Fragment ${index + 1}`}
                      value={fragment}
                      onChange={event => setFragment(index, event.target.value)}
                    />
                    {fragments.length > 1 && (
                      <button
                        type="button"
                        className="icon-button quick-edit-remove-field"
                        aria-label={`Remove fragment ${index + 1}`}
                        title="Remove field"
                        onClick={() => removeFragmentField(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </span>
                </label>
              ))}
              <button
                type="button"
                className="quick-edit-add"
                onClick={() => setFragments(current => [...current, ''])}
              >
                <Plus size={16} /> Add fragment
              </button>
              <p className="quick-edit-hint">Every exact occurrence of each fragment will be removed.</p>
            </div>
          )}

          <div className="quick-edit-message" aria-live="polite">
            {error && <span>{error}</span>}
          </div>
        </div>

        <footer className="quick-edit-footer">
          <button type="button" className="quick-edit-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="quick-edit-primary" onClick={handleApply}>
            {mode === 'replace' ? `Replace all in ${editorLabel(editorId)}` : `Remove all from ${editorLabel(editorId)}`}
          </button>
        </footer>
      </section>
    </div>
  );
};
