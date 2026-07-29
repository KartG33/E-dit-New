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
      <div className="empty-state p-2 text-center">
        No saved presets
      </div>
    );
  }

  return (
    <div className="preset-list">
      {presets.map((preset) => (
        <button
          key={preset.id ?? preset.name}
          onClick={() => applyCommand((text) => applyPreset(text, preset.data))}
          className="preset-button"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};
