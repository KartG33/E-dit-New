import { describe, it, expect } from 'vitest';
import { compareLines } from '../src/lib/diff';

describe('Line Diff', () => {
  it('identifies identical text', () => {
    const diffs = compareLines('hello\nworld', 'hello\nworld');
    expect(diffs).toHaveLength(1);
    expect(diffs[0].added).toBeFalsy();
    expect(diffs[0].removed).toBeFalsy();
  });

  it('identifies added lines', () => {
    const diffs = compareLines('hello', 'hello\nworld');
    expect(diffs.some(d => d.added && d.value.includes('world'))).toBe(true);
  });

  it('identifies removed lines', () => {
    const diffs = compareLines('hello\nworld', 'hello');
    expect(diffs.some(d => d.removed && d.value.includes('world'))).toBe(true);
  });

  it('identifies changed lines', () => {
    const diffs = compareLines('hello\nworld', 'hello\nthere');
    expect(diffs.some(d => d.removed && d.value.includes('world'))).toBe(true);
    expect(diffs.some(d => d.added && d.value.includes('there'))).toBe(true);
  });

  it('handles empty documents', () => {
    const diffs = compareLines('', '');
    expect(diffs).toHaveLength(0);
    
    const diffs2 = compareLines('', 'hello');
    expect(diffs2.some(d => d.added)).toBe(true);
  });

  it('uses safe fallback for large documents (>200k chars)', () => {
    const largeLine = 'a'.repeat(100); // 100 chars
    const largeOld = new Array(1500).fill(largeLine).join('\n'); // 150k chars
    const largeNew = largeOld + '\n' + new Array(1000).fill(largeLine).join('\n'); // 250k chars total
    
    // total > 200,000, should trigger fallback
    const diffs = compareLines(largeOld, largeNew);
    expect(diffs.length).toBeGreaterThan(0);
    // Should correctly identify the common prefix
    expect(diffs[0].added).toBeFalsy();
    expect(diffs[0].removed).toBeFalsy();
    // Should correctly identify the added lines
    expect(diffs.some(d => d.added)).toBe(true);
  });
});
