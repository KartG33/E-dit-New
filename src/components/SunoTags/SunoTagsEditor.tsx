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
    <div className="flex flex-wrap items-start gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
      <section className="flex min-w-44 flex-col gap-2" aria-labelledby="existing-suno-tags-heading">
        <h3 id="existing-suno-tags-heading" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Existing Tags
        </h3>

        {existingTags.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs" aria-live="polite">
            {existingTags.map(({ tag, count }) => (
              <li key={tag} className="flex items-center justify-between gap-3 text-zinc-700 dark:text-zinc-300">
                <span className="break-all">[{tag}]</span>
                <span
                  className="min-w-6 rounded-full bg-zinc-100 px-1.5 py-0.5 text-center text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  aria-label={`${count} occurrences`}
                >
                  {count}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-400" aria-live="polite">No tags in active editor</p>
        )}
      </section>

      <section className="flex flex-1 flex-col gap-3" aria-labelledby="tag-builder-heading">
        <h3 id="tag-builder-heading" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tag Builder</h3>
      
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Mult:</label>
        <select 
          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs p-1 outline-none text-zinc-700 dark:text-zinc-300"
          value={multiplier} 
          onChange={e => setMultiplier(Number(e.target.value))}
        >
          <option value={1}>x1</option>
          <option value={2}>x2</option>
          <option value={3}>x3</option>
          <option value={4}>x4</option>
        </select>
        
        <label className="text-xs text-zinc-500 ml-2">Num:</label>
        <input 
          type="text" 
          placeholder="e.g. 1" 
          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs p-1 w-12 outline-none text-zinc-700 dark:text-zinc-300"
          value={customNum}
          onChange={e => setCustomNum(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SUNO_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => handleInsert(tag)}
            className="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
      </section>
    </div>
  );
};
