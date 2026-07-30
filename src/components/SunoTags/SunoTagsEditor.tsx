import { useState } from 'react';
import {
  buildSunoTag,
  findSunoTags,
  isValidSunoTag,
  removeSunoTag,
  replaceSunoTag,
  type SunoTagOccurrence,
} from '../../lib/commands/suno';

const SUNO_TAGS = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Hook',
  'Refrain', 'Break', 'Drop', 'Interlude', 'Solo', 'Fade Out', 'Outro',
];

interface SunoTagsEditorProps {
  editorText: string;
  onInsert: (tag: string) => void;
  onChangeText: (command: (text: string) => string) => void;
}

export const SunoTagsEditor = ({ editorText, onInsert, onChangeText }: SunoTagsEditorProps) => {
  const [sectionNumber, setSectionNumber] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [selectedTag, setSelectedTag] = useState<SunoTagOccurrence | null>(null);
  const [editedTag, setEditedTag] = useState('');
  const existingTags = findSunoTags(editorText);
  const numberIsValid = sectionNumber === '' || /^[1-9]\d*$/.test(sectionNumber);
  const customTagIsValid = isValidSunoTag(customTag);
  const editedTagIsValid = isValidSunoTag(editedTag);

  const handleInsertPreset = (tag: string) => {
    const formattedTag = buildSunoTag(tag, sectionNumber);
    if (!formattedTag) return;
    onInsert(formattedTag.slice(1, -1));
  };

  const handleInsertCustom = () => {
    const formattedTag = buildSunoTag(customTag);
    if (!formattedTag) return;
    onInsert(formattedTag.slice(1, -1));
    setCustomTag('');
  };

  const handleSelect = (occurrence: SunoTagOccurrence) => {
    setSelectedTag(occurrence);
    setEditedTag(occurrence.tag);
  };

  const handleSave = () => {
    if (!selectedTag || !editedTagIsValid) return;
    onChangeText((text) => replaceSunoTag(text, selectedTag, editedTag));
    setSelectedTag(null);
    setEditedTag('');
  };

  const handleDelete = () => {
    if (!selectedTag) return;
    onChangeText((text) => removeSunoTag(text, selectedTag));
    setSelectedTag(null);
    setEditedTag('');
  };

  return (
    <div className="tag-workspace">
      <section className="tag-section tag-existing" aria-labelledby="existing-suno-tags-heading">
        <h3 id="existing-suno-tags-heading" className="section-eyebrow">
          Existing Tags
        </h3>

        {existingTags.length > 0 ? (
          <ol className="tag-list tag-list-scroll" aria-live="polite">
            {existingTags.map((occurrence, index) => {
              const isSelected = selectedTag?.start === occurrence.start
                && selectedTag?.end === occurrence.end
                && selectedTag?.raw === occurrence.raw;

              return (
                <li key={`${occurrence.start}-${occurrence.end}`} className="tag-list-item">
                  <button
                    type="button"
                    className={`tag-list-select ${isSelected ? 'is-selected' : ''}`}
                    aria-label={`Edit tag ${index + 1}: [${occurrence.tag}]`}
                    aria-pressed={isSelected}
                    title={`[${occurrence.tag}]`}
                    onClick={() => handleSelect(occurrence)}
                  >
                    <span className="tag-list-value">[{occurrence.tag}]</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="empty-state" aria-live="polite">No tags in active editor</p>
        )}

        {selectedTag && (
          <div className="tag-edit-controls">
            <label className="field-label" htmlFor="suno-existing-tag">Edit selected tag</label>
            <input
              id="suno-existing-tag"
              type="text"
              className="field-control tag-text-input"
              value={editedTag}
              onChange={(event) => setEditedTag(event.target.value)}
            />
            <div className="tag-edit-actions">
              <button type="button" className="tag-button" disabled={!editedTagIsValid} onClick={handleSave}>
                Save
              </button>
              <button type="button" className="tag-button is-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="tag-section is-builder" aria-labelledby="tag-builder-heading">
        <h3 id="tag-builder-heading" className="section-eyebrow">Tag Builder</h3>

        <div className="tag-controls">
          <label className="field-label" htmlFor="suno-tag-number">Num:</label>
          <input
            id="suno-tag-number"
            type="text"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            placeholder="e.g. 1"
            className={`field-control w-12 ${numberIsValid ? '' : 'is-invalid'}`}
            value={sectionNumber}
            aria-invalid={!numberIsValid}
            onChange={(event) => setSectionNumber(event.target.value)}
          />
        </div>

        <div className="tag-buttons">
          {SUNO_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={!numberIsValid}
              onClick={() => handleInsertPreset(tag)}
              className="tag-button"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="tag-custom-controls">
          <label className="field-label" htmlFor="suno-custom-tag">Custom tag</label>
          <div className="tag-custom-row">
            <input
              id="suno-custom-tag"
              type="text"
              className="field-control tag-text-input"
              placeholder="e.g. Whispered Vocal"
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
            />
            <button
              type="button"
              className="tag-button"
              disabled={!customTagIsValid}
              onClick={handleInsertCustom}
            >
              Add
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
