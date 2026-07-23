import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import type { Preset } from '../../lib/db';
import { applyRegexPreset } from '../../lib/presets/execute';

export const PresetsTab = ({ applyCommand }: { applyCommand: (cmd: (text: string) => string) => void }) => {
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    db.presets.orderBy('order').toArray().then(setPresets);
  }, []);

  const handleApply = (preset: Preset) => {
    // Preset is actually RegexPreset in execution, we cast it since DB might store it
    applyCommand((text) => applyRegexPreset(text, preset as any));
  };

  return (
    <div className="flex flex-col gap-2">
      {presets.map(p => (
        <button
          key={p.id}
          onClick={() => handleApply(p)}
          className="w-full py-2 px-3 text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm transition-colors text-left font-medium text-zinc-700 dark:text-zinc-300"
        >
          {p.name}
        </button>
      ))}
      {presets.length === 0 && (
        <div className="text-center text-zinc-500 text-sm mt-4">
          No presets found.
        </div>
      )}
    </div>
  );
};
