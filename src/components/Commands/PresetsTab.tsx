import { applyPreset } from '../../lib/presets/execute';
import { usePresets } from '../../hooks/usePresets';
import { db, type EditDatabase } from '../../lib/db';

interface PresetsTabProps {
  applyCommand: (cmd: (text: string) => string) => void;
  database?: EditDatabase;
}

export const PresetsTab = ({ applyCommand, database = db }: PresetsTabProps) => {
  const { presets, isLoading } = usePresets(database);

  if (presets.length === 0) {
    return (
      <div className="empty-state">
        {isLoading ? 'Loading presets...' : 'No saved presets'}
      </div>
    );
  }

  return (
    <div className="preset-list">
      {presets.map((preset) => (
        <button
          key={preset.id ?? preset.name}
          onClick={() => applyCommand((text) => applyPreset(text, preset.data))}
          className="command-button"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};
