import { describe, it, expect } from 'vitest';
import * as textCmds from '../src/lib/commands/text';
import * as sunoCmds from '../src/lib/commands/suno';
import { COMMAND_REGISTRY } from '../src/lib/commands/registry';

describe('Text Commands', () => {
  it('keeps stable command IDs mapped to the unambiguous internal names', () => {
    expect(COMMAND_REGISTRY['text.spaces']).toBe(textCmds.collapseSpaces);
    expect(COMMAND_REGISTRY['text.edges']).toBe(textCmds.trimLines);
    expect(COMMAND_REGISTRY['text.upper']).toBe(textCmds.toUpperCase);
    expect(COMMAND_REGISTRY['suno.trim']).toBe(sunoCmds.sunoTrim);
    expect(COMMAND_REGISTRY['suno.upper']).toBe(sunoCmds.capitalizeSunoLines);
  });

  it('Spaces', () => {
    expect(textCmds.collapseSpaces('hello   world\t!')).toBe('hello world !');
  });

  it('Edges', () => {
    expect(textCmds.trimLines('  hello  \n  world ')).toBe('hello\nworld');
    expect(textCmds.trimLines('  hello  \r\n  world ')).toBe('hello\nworld'); // crlf test
  });

  it('Upper and Lower', () => {
    expect(textCmds.toUpperCase('hello')).toBe('HELLO');
    expect(textCmds.lower('HELLO')).toBe('hello');
  });

  it('Sentence', () => {
    expect(textCmds.sentence('hello. world! yes')).toBe('Hello. World! Yes');
    // Unicode / Cyrillic test
    expect(textCmds.sentence('привет. как дела? хорошо')).toBe('Привет. Как дела? Хорошо');
    expect(textCmds.sentence('café. oui')).toBe('Café. Oui');
  });

  it('Punctuation spacing', () => {
    expect(textCmds.removeSpaceBeforePunctuation('hello , world !')).toBe('hello, world!');
    expect(textCmds.addSpaceAfterPunctuation('hello,world!')).toBe('hello, world!');
  });

  it('Line formatting', () => {
    expect(textCmds.line1('a\n\n\n\nb')).toBe('a\n\nb');
    expect(textCmds.line1('a\r\n\r\n\r\n\r\nb')).toBe('a\n\nb'); // CRLF
    expect(textCmds.line1('a\n  \n\nb')).toBe('a\n\nb'); // blank lines with spaces
    
    expect(textCmds.lineX('\n\na\n\n\nb\n')).toBe('a\nb\n');
    expect(textCmds.lineX(' \n  \r\na\nb\n')).toBe('a\nb\n');
  });

  it('Inline formatting', () => {
    // Basic
    expect(textCmds.inline('a\nb\n\nc\nd')).toBe('a b\n\nc d');
    expect(textCmds.inlineComma('a\nb\n\nc\nd')).toBe('a, b\n\nc, d');
    
    // Multiple consecutive lines
    expect(textCmds.inline('one\ntwo\nthree')).toBe('one two three');
    
    // Multiple paragraphs
    expect(textCmds.inline('p1L1\np1L2\n\np2L1\np2L2\np2L3')).toBe('p1L1 p1L2\n\np2L1 p2L2 p2L3');
    
    // CRLF
    expect(textCmds.inline('one\r\ntwo')).toBe('one two');
    
    // Blank lines with spaces
    expect(textCmds.inline('one\ntwo\n  \nthree')).toBe('one two\n\nthree');
    
    // Edges cleaning test (leading/trailing spaces should be removed before joining)
    expect(textCmds.inline('  one  \n  two  ')).toBe('one two');
    expect(textCmds.inlineComma('  one  \n  two  ')).toBe('one, two');

    // Empty text
    expect(textCmds.inline('')).toBe('');
    expect(textCmds.inline('   ')).toBe('   ');
  });

  it('1 Million Characters test', () => {
    const largeText = 'a'.repeat(1000000);
    const start = performance.now();
    const result = textCmds.toUpperCase(largeText);
    const end = performance.now();
    
    expect(result.length).toBe(1000000);
    expect(end - start).toBeLessThan(1000); // should be fast
  });
});
