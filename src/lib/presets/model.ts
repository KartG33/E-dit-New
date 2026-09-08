import type { PresetData, PresetStep, SequencePreset } from '../db';
import { COMMAND_REGISTRY } from '../commands/registry';

export const toSequence = (data: PresetData): SequencePreset => {
  if (data.type === 'sequence') return structuredClone(data);
  if (data.type === 'chain') return { type: 'sequence', steps: data.commands.map(command => ({ type: 'command', command })) };
  return { type: 'sequence', steps: [{ type: 'replace', pattern: data.pattern, replacement: data.replacement, regex: true, flags: data.flags }] };
};

export function validateSteps(value: unknown): asserts value is PresetStep[] {
  if (!Array.isArray(value)) throw new Error('Steps must be an array.');
  for (const [index, step] of value.entries()) {
    const fail = (message: string): never => { throw new Error(`Step ${index + 1}: ${message}`); };
    if (!step || typeof step !== 'object' || Array.isArray(step)) fail('Invalid step.');
    const keys = step.type === 'command' ? ['type', 'command'] : step.type === 'replace'
      ? ['type', 'pattern', 'replacement', 'regex', 'flags'] : step.type === 'remove' ? ['type', 'fragments'] : [];
    if (keys.length === 0 || Object.keys(step).some(key => !keys.includes(key))) fail('Unknown step type or field.');
    if (step.type === 'command') {
      if (typeof step.command !== 'string' || !Object.hasOwn(COMMAND_REGISTRY, step.command)) fail('Unknown command.');
    } else if (step.type === 'replace') {
      if (typeof step.pattern !== 'string' || typeof step.replacement !== 'string' || typeof step.flags !== 'string' || typeof step.regex !== 'boolean') fail('Invalid replacement fields.');
      if (!step.pattern && !step.regex) fail('Enter text to find.');
      if (!step.regex && /[^gi]/.test(step.flags)) fail('Literal search supports only global and case-insensitive flags.');
      try { new RegExp(step.regex ? step.pattern : '', step.flags); }
      catch { fail('The search pattern is not a valid regular expression.'); }
    } else if (!Array.isArray(step.fragments) || step.fragments.length === 0 || step.fragments.some((part: unknown) => typeof part !== 'string' || part.length === 0)) {
      fail('Enter at least one non-empty fragment.');
    }
  }
}
