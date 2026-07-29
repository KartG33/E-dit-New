import { useState } from 'react';
import { groupSunoTags } from '../../lib/commands/suno';

const SUNO_TAGS = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Hook', 
  'Refrain', 'Break', 'Drop', 'Interlude', 'Solo', 'Fade Out', 'Outro'
];

interface SunoTagsEditorProps {
  editorText: string;
  onInsert: (tag: string) => void;
}

export const SunoTagsEditor = ({ editorText, onInsert }: SunoTagsEditorProps) => {
  const [multiplier, setMultiplier] = useState(1);
  const [customNum, setCustomNum] = useState('');
  const existingTags = groupSunoTags(editorText);

  const handleInsert = (tag: string) => {
    let finalTag = tag;
    if (customNum) finalTag += ` ${customNum}`;
    if (multiplier > 1) finalTag += ` x${multiplier}`;
    
    // Add brackets and a newline, since tags usually start a section
    finalTag = `[${finalTag}]\n`;
    onInsert(finalTag);
  };

  return (
    <div className="tag-workspace">
      <section className="tag-section tag-existing" aria-labelledby="existing-suno-tags-heading">
        <h3 id="existing-suno-tags-heading" className="section-eyebrow">
          Existing Tags
        </h3>

        {existingTags.length > 0 ? (
          <ul className="tag-list tag-list-scroll" aria-live="polite">
            {existingTags.map(({ tag, count }) => (
              <li key={tag} className="tag-list-item">
                <span className="tag-list-value" title={`[${tag}]`}>[{tag}]</span>
                <span
                  className="tag-count"
                  aria-label={`${count} occurrences`}
                >
                  {count}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state" aria-live="polite">No tags in active editor</p>
        )}
      </section>

      <section className="tag-section is-builder" aria-labelledby="tag-builder-heading">
        <h3 id="tag-builder-heading" className="section-eyebrow">Tag Builder</h3>
      
      <div className="tag-controls">
        <label className="field-label" htmlFor="suno-tag-multiplier">Mult:</label>
        <select 
          id="suno-tag-multiplier"
          className="field-control"
          value={multiplier} 
          onChange={e => setMultiplier(Number(e.target.value))}
        >
          <option value={1}>x1</option>
          <option value={2}>x2</option>
          <option value={3}>x3</option>
          <option value={4}>x4</option>
        </select>
        
        <label className="field-label" htmlFor="suno-tag-number">Num:</label>
        <input 
          id="suno-tag-number"
          type="text" 
          placeholder="e.g. 1" 
          className="field-control w-12"
          value={customNum}
          onChange={e => setCustomNum(e.target.value)}
        />
      </div>

      <div className="tag-buttons">
        {SUNO_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => handleInsert(tag)}
            className="tag-button"
          >
            {tag}
          </button>
        ))}
      </div>
      </section>
    </div>
  );
};
