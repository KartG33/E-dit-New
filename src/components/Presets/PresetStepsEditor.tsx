import { useState } from 'react';
import type { PresetStep } from '../../lib/db';
import type { CommandId } from '../../lib/commands/registry';
import { PRESET_COMMAND_OPTIONS, getPresetCommandLabel } from '../../lib/presets/commandOptions';

export function PresetStepsEditor({ steps, onChange }: { steps: PresetStep[]; onChange: (steps: PresetStep[]) => void }) {
  const [command, setCommand] = useState<CommandId>('text.spaces');
  const update = (index: number, step: PresetStep) => onChange(steps.map((item, i) => i === index ? step : item));
  const move = (index: number, delta: number) => {
    const next = [...steps];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  return <div className="preset-config-section">
    <div className="preset-add-command">
      <label className="preset-field"><span>Add command</span><select value={command} onChange={event => setCommand(event.target.value as CommandId)}>
        {(['Text', 'Suno', 'Symbols'] as const).map(group => <optgroup label={group} key={group}>
          {PRESET_COMMAND_OPTIONS.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </optgroup>)}
      </select></label>
      <button className="preset-secondary-button" onClick={() => onChange([...steps, { type: 'command', command }])}>Add</button>
    </div>
    <div className="preset-step-additions">
      <button className="preset-secondary-button" onClick={() => onChange([...steps, { type: 'replace', pattern: '', replacement: '', regex: false, flags: 'g' }])}>+ Add replacement</button>
      <button className="preset-secondary-button" onClick={() => onChange([...steps, { type: 'remove', fragments: [''] }])}>+ Add removal</button>
    </div>
    <ol className="preset-steps">
      {steps.map((step, index) => <li key={index} className="preset-step">
        <div className="preset-step-heading"><strong>{index + 1}. {step.type === 'command' ? getPresetCommandLabel(step.command) : step.type === 'replace' ? 'Replace text' : 'Remove fragments'}</strong>
          <div className="preset-step-actions">
            <button className="preset-icon-action" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
            <button className="preset-icon-action" aria-label={`Move step ${index + 1} down`} disabled={index === steps.length - 1} onClick={() => move(index, 1)}>↓</button>
            <button className="preset-icon-action" aria-label={`Remove step ${index + 1}`} onClick={() => onChange(steps.filter((_, i) => i !== index))}>×</button>
          </div>
        </div>
        {step.type === 'replace' && <div className="preset-replace-fields">
          <label className="preset-field"><span>Find text</span><input aria-label={`Find text ${index + 1}`} value={step.pattern} onChange={event => update(index, { ...step, pattern: event.target.value })} /></label>
          <label className="preset-field"><span>Replace with</span><input aria-label={`Replace with ${index + 1}`} value={step.replacement} onChange={event => update(index, { ...step, replacement: event.target.value })} /></label>
          <div className="preset-checks">
            <label><input type="checkbox" aria-label={`Use regular expression ${index + 1}`} checked={step.regex} onChange={event => update(index, { ...step, regex: event.target.checked, flags: event.target.checked ? step.flags : step.flags.replace(/[^gi]/g, '') })} /> Regular expression</label>
            <label><input type="checkbox" checked={step.flags.includes('g')} onChange={event => update(index, { ...step, flags: event.target.checked ? step.flags.replaceAll('g', '') + 'g' : step.flags.replaceAll('g', '') })} /> Replace all</label>
            <label><input type="checkbox" checked={step.flags.includes('i')} onChange={event => update(index, { ...step, flags: event.target.checked ? step.flags.replaceAll('i', '') + 'i' : step.flags.replaceAll('i', '') })} /> Ignore case</label>
          </div>
          {step.regex && <label className="preset-field"><span>Regex flags</span><input aria-label={`Regex flags ${index + 1}`} value={step.flags} onChange={event => update(index, { ...step, flags: event.target.value })} /></label>}
        </div>}
        {step.type === 'remove' && <div className="preset-replace-fields">
          {step.fragments.map((fragment, fragmentIndex) => <label className="preset-field" key={fragmentIndex}><span>Fragment {fragmentIndex + 1}</span>
            <span className="quick-edit-input-row"><input aria-label={`Step ${index + 1} fragment ${fragmentIndex + 1}`} value={fragment}
              onChange={event => update(index, { ...step, fragments: step.fragments.map((part, i) => i === fragmentIndex ? event.target.value : part) })} />
              {step.fragments.length > 1 && <button className="preset-icon-action" aria-label={`Delete fragment ${fragmentIndex + 1} from step ${index + 1}`} onClick={() => update(index, { ...step, fragments: step.fragments.filter((_, i) => i !== fragmentIndex) })}>×</button>}
            </span>
          </label>)}
          <button className="preset-secondary-button" onClick={() => update(index, { ...step, fragments: [...step.fragments, ''] })}>+ Add fragment</button>
        </div>}
      </li>)}
    </ol>
    {steps.length === 0 && <p className="empty-state">Add steps in the order they should run.</p>}
  </div>;
}
