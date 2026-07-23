import { describe, it, expect } from 'vitest';
import { RegexPreset } from '../src/lib/db';
import { applyRegexPreset } from '../src/lib/presets/execute';

describe('Regex Presets', () => {
  it('applies a valid regex preset', () => {
    const preset: RegexPreset = {
      type: 'regex',
      pattern: 'foo',
      flags: 'g',
      replacement: 'bar'
    };
    expect(applyRegexPreset('foo foo', preset)).toBe('bar bar');
  });

  it('throws a caught error on invalid regex', () => {
    const preset: RegexPreset = {
      type: 'regex',
      pattern: '[invalid',
      flags: 'g',
      replacement: 'bar'
    };
    expect(() => applyRegexPreset('test', preset)).toThrow('Invalid regular expression');
  });
});
