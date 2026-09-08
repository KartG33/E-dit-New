import type { Preset } from '../../lib/db';
import { toSequence } from '../../lib/presets/model';

interface Props { presets: Preset[]; selected: number | null; loading: boolean; disabled?: boolean; onNew: () => void; onSelect: (preset: Preset) => void }
export function PresetList({ presets, selected, loading, disabled, onNew, onSelect }: Props) {
  return <aside className="preset-manager-list">
    <button className="preset-new-button" disabled={disabled} onClick={onNew}><span aria-hidden="true">+</span> New preset</button>
    <div className="preset-manager-list-scroll">
      {presets.map(preset => <button key={preset.id} disabled={disabled} className={`preset-manager-list-item ${preset.id === selected ? 'is-active' : ''}`} onClick={() => onSelect(preset)}>
        <span>{preset.name}</span><small>{toSequence(preset.data).steps.length} steps</small>
      </button>)}
      {!loading && presets.length === 0 && <div className="preset-manager-empty">No presets yet.</div>}
    </div>
  </aside>;
}
