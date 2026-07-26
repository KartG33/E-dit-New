import { describe, it, expect } from 'vitest';
import { analyzeSymbols, removeTokenFromText } from '../src/lib/analyzer';

describe('Analyzer', () => {
  it('supports compound tokens longest-match-first', () => {
    const counts = analyzeSymbols('--- - ... . ==== == = ``` `');
    const tokens = Object.fromEntries(counts.map(t => [t.token, t.count]));
    expect(tokens['---']).toBe(1);
    expect(tokens['-']).toBe(1);
    expect(tokens['...']).toBe(1);
    expect(tokens['.']).toBe(1);
    expect(tokens['===']).toBe(1);
    expect(tokens['==']).toBe(1);
    expect(tokens['=']).toBe(2); 
    
    const c2 = analyzeSymbols('--- -');
    const t2 = Object.fromEntries(c2.map(t => [t.token, t.count]));
    expect(t2['---']).toBe(1);
    expect(t2['-']).toBe(1);
  });

  it('removes single token without destroying compound token', () => {
    const text = '--- - --';
    const result = removeTokenFromText(text, '-');
    expect(result).toBe('---  --');
    
    const result2 = removeTokenFromText('** * *', '*');
    expect(result2).toBe('**  ');
    
    const result3 = removeTokenFromText('=== == =', '=');
    expect(result3).toBe('=== == ');
  });

  it('preserves indentation when removing numbered lists', () => {
    const text = '  1. Hello\n    2. World';
    const result = removeTokenFromText(text, 'List (1.)');
    expect(result).toBe('  Hello\n    World');
  });
  
  it('count and remove tests', () => {
    const counts = analyzeSymbols('1. hello\n  2. world');
    const tokens = Object.fromEntries(counts.map(t => [t.token, t.count]));
    expect(tokens['List (1.)']).toBe(2);
  });
});
