import { describe, it, expect } from 'vitest';
import * as sunoCmds from '../src/lib/commands/suno';

describe('Suno Commands', () => {
  it('groups tags by exact trimmed content in first-appearance order', () => {
    expect(sunoCmds.groupSunoTags('[Verse]\nLine\n[ Chorus ]\n[Verse]\n[verse]\n[]')).toEqual([
      { tag: 'Verse', count: 2 },
      { tag: 'Chorus', count: 1 },
      { tag: 'verse', count: 1 },
    ]);
    expect(sunoCmds.groupSunoTags('Text without tags')).toEqual([]);
  });

  it('Clean', () => {
    // structural tag
    expect(sunoCmds.clean('[Verse 1 (soft piano)]\nText')).toBe('[Verse 1]\nText');
    // non-structural tag
    expect(sunoCmds.clean('[Soft piano playing]\nText')).toBe('Text');
    // clean explanations after |, -, :, ,
    expect(sunoCmds.clean('[Chorus | intense]')).toBe('[Chorus]');
    expect(sunoCmds.clean('[Pre-Chorus: energetic]')).toBe('[Pre-Chorus]');
    expect(sunoCmds.clean('[Verse, fast]')).toBe('[Verse]');
    expect(sunoCmds.clean('[Hook - melodic]')).toBe('[Hook]');
    
    // Test numbers and multipliers
    expect(sunoCmds.clean('[Chorus x2]')).toBe('[Chorus x2]');
    expect(sunoCmds.clean('[Verse 2]')).toBe('[Verse 2]');
    expect(sunoCmds.clean('[Fade Out x3]')).toBe('[Fade Out x3]');
    
    // Ensure final trimming and empty lines normalization
    expect(sunoCmds.clean('\n\n[Chorus]\n\n\n[Drop]\n')).toBe('[Chorus]\n\n[Drop]');
  });

  it('Space', () => {
    // Should provide one empty line before and after tags
    const input = 'Text\n[Verse 1]\nText';
    const output = sunoCmds.space(input);
    expect(output).toBe('Text\n\n[Verse 1]\n\nText');
    
    // Repeated application should not add extra lines
    expect(sunoCmds.space(output)).toBe(output);
  });

  it('Upper', () => {
    // Should capitalize the first letter of each text line without changing tags
    expect(sunoCmds.capitalizeSunoLines('[Verse 1]\nhello world\n[Chorus]\nyes')).toBe('[Verse 1]\nHello world\n[Chorus]\nYes');
    // Unicode
    expect(sunoCmds.capitalizeSunoLines('[Verse 1]\nпривет')).toBe('[Verse 1]\nПривет');
  });
  
  it('Lyrics', () => {
    expect(sunoCmds.lyrics('[Verse 1]\nhello world')).toBe('hello world');
    // Multiple tags and newlines
    expect(sunoCmds.lyrics('[Verse]\nline1\n[Chorus]\nline2\n\n\nline3')).toBe('line1\nline2\n\nline3');
    // Empty text
    expect(sunoCmds.lyrics('')).toBe('');
    expect(sunoCmds.lyrics('[Instrumental]')).toBe('');
  });

  it('Structure', () => {
    expect(sunoCmds.structure('[Verse 1]\nhello world\n[Chorus]')).toBe('[Verse 1]\n[Chorus]');
    // Empty text or no tags
    expect(sunoCmds.structure('hello world')).toBe('');
    expect(sunoCmds.structure('')).toBe('');
  });
  it('Trim', () => {
    // Multiple blocks and excess newlines
    const input = '[Verse]\nline1\n\n\nline2\n\n[Chorus]\nline3';
    expect(sunoCmds.sunoTrim(input)).toBe('[Verse]\nline1\nline2\n\n[Chorus]\nline3');
    
    // CRLF
    expect(sunoCmds.sunoTrim('[Verse]\r\nline1\r\n\r\n\r\nline2')).toBe('[Verse]\nline1\nline2');
    
    // Empty text
    expect(sunoCmds.sunoTrim('')).toBe('');
    
    // Repeated application
    const output = sunoCmds.sunoTrim(input);
    expect(sunoCmds.sunoTrim(output)).toBe(output);

    // Neighboring tags
    expect(sunoCmds.sunoTrim('[Verse 1]\n\n[Chorus]')).toBe('[Verse 1]\n\n[Chorus]');
  });
});
