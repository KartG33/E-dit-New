import { useEffect, useState } from 'react';
import { db, type Preset } from '../../lib/db';
import { applyPreset } from '../../lib/presets/execute';

interface PresetsTabProps {
  applyCommand: (cmd: (text: string) => string) => void;
}

export const PresetsTab = ({ applyCommand }: PresetsTabProps) => {
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    let isMounted = true;
    db.presets.toArray().then((items) => {
      if (isMounted) {
        setPresets(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (presets.length === 0) {
    return (
      <div className="text-xs text-zinc-500 p-2 text-center">
        No saved presets
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id ?? preset.name}
          onClick={() => applyCommand((text) => applyPreset(text, preset.data))}
          className="w-full py-2 px-3 text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm transition-colors font-medium text-zinc-700 dark:text-zinc-300 text-left"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};
