// Suno Commands

const SUNO_STRUCTURAL_TAGS = [
  'intro', 'verse', 'pre-chorus', 'prechorus', 'chorus', 'bridge',
  'hook', 'refrain', 'break', 'drop', 'interlude', 'solo',
  'fade out', 'fadeout', 'outro'
];

export interface SunoTagOccurrence {
  tag: string;
  raw: string;
  start: number;
  end: number;
}

export const findSunoTags = (text: string): SunoTagOccurrence[] => {
  const tags: SunoTagOccurrence[] = [];

  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    const tag = match[1].trim();
    if (!tag || match.index === undefined) continue;

    tags.push({
      tag,
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tags;
};

export const isValidSunoTag = (tag: string): boolean => {
  const trimmed = tag.trim();
  return trimmed.length > 0
    && !trimmed.includes('[')
    && !trimmed.includes(']')
    && !/[\r\n]/.test(trimmed);
};

export const buildSunoTag = (tag: string, sectionNumber = ''): string => {
  const trimmedTag = tag.trim();
  const trimmedNumber = sectionNumber.trim();

  if (!isValidSunoTag(trimmedTag)) return '';
  if (trimmedNumber && !/^[1-9]\d*$/.test(trimmedNumber)) return '';

  return `[${trimmedTag}${trimmedNumber ? ` ${trimmedNumber}` : ''}]`;
};

export const replaceSunoTag = (
  text: string,
  occurrence: SunoTagOccurrence,
  nextTag: string,
): string => {
  const replacement = buildSunoTag(nextTag);
  if (!replacement || text.slice(occurrence.start, occurrence.end) !== occurrence.raw) return text;
  return text.slice(0, occurrence.start) + replacement + text.slice(occurrence.end);
};

export const removeSunoTag = (text: string, occurrence: SunoTagOccurrence): string => {
  if (text.slice(occurrence.start, occurrence.end) !== occurrence.raw) return text;

  const lineStart = text.lastIndexOf('\n', occurrence.start - 1) + 1;
  const nextLineBreak = text.indexOf('\n', occurrence.end);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
  const lineWithoutTag = (
    text.slice(lineStart, occurrence.start) + text.slice(occurrence.end, lineEnd)
  ).trim();

  if (lineWithoutTag.length === 0) {
    if (nextLineBreak !== -1) {
      return text.slice(0, lineStart) + text.slice(nextLineBreak + 1);
    }
    if (lineStart > 0) {
      const previousLineBreakStart = text[lineStart - 2] === '\r' ? lineStart - 2 : lineStart - 1;
      return text.slice(0, previousLineBreakStart);
    }
  }

  return text.slice(0, occurrence.start) + text.slice(occurrence.end);
};

export interface SunoTagInsertion {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export const insertSunoTag = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  tag: string,
): SunoTagInsertion => {
  const formattedTag = buildSunoTag(tag);
  if (!formattedTag) {
    return { text, selectionStart, selectionEnd };
  }

  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const before = text.slice(0, start);
  const after = text.slice(end);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const prefix = before.length > 0 && !before.endsWith('\n') ? newline : '';
  const suffix = after.length === 0 || !after.startsWith('\n') ? newline : '';
  const insertion = `${prefix}${formattedTag}${suffix}`;
  const nextPosition = start + insertion.length;

  return {
    text: before + insertion + after,
    selectionStart: nextPosition,
    selectionEnd: nextPosition,
  };
};

export const clean = (text: string): string => {
  // Extract all tags in brackets
  let result = text.replace(/\[([^\]]+)\]/g, (_match, content) => {
    // Find the first separator to isolate structural part
    const structuralPart = content.split(/\||:|,|\(|\)| - /)[0].trim();
    
    // Check if it matches any structural tag (allowing numbers and multipliers)
    const baseMatch = structuralPart.toLowerCase().match(/^([a-z\s-]+)/);
    if (!baseMatch) return ''; // completely remove if it has no letters
    
    let baseTag = structuralPart.toLowerCase();
    // Remove numbers and x2/x3 multipliers for whitelist matching
    baseTag = baseTag.replace(/\s+x?\d+$/i, '').trim();

    if (SUNO_STRUCTURAL_TAGS.includes(baseTag)) {
      return `[${structuralPart}]`;
    }
    
    // If it's not structural, remove it
    return '';
  });

  // Clean up remaining newlines caused by removing tags entirely
  result = result.replace(/^[ \t]+$/gm, '');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
};

export const space = (text: string): string => {
  // Normalize newlines around tags
  let result = text.replace(/\r\n/g, '\n');
  
  // First, strip all blank lines surrounding tags to avoid accumulating them
  result = result
    .replace(/\n*(\[[^\]]+\])\n*/g, '\n\n$1\n\n')
    // Clean up excess newlines if multiple tags are sequential
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
  return result;
};

export const capitalizeSunoLines = (text: string): string => {
  return text
    .split(/\r?\n/)
    .map(line => {
      if (line.trim().startsWith('[')) return line;
      return line.replace(/^(\s*)(\p{L})/u, (_match, space, char) => space + char.toUpperCase());
    })
    .join('\n');
};

export const lyrics = (text: string): string => {
  let result = text.replace(/^[ \t]*\[[^\]]+\][ \t]*\r?\n?/gm, '');
  result = result.replace(/\[([^\]]+)\]/g, '');
  result = result.replace(/^[ \t]+$/gm, '');
  return result.replace(/\n{3,}/g, '\n\n').trim();
};

export const structure = (text: string): string => {
  const matches = text.match(/\[([^\]]+)\]/g);
  return matches ? matches.join('\n') : '';
};

export const sunoTrim = (text: string): string => {
  let result = text.replace(/\r\n/g, '\n');
  
  const blocks = result.split(/(\[[^\]]+\])/);
  const processed = blocks.map(block => {
    if (block.startsWith('[')) return block;
    if (block.trim() === '') return block; // preserve empty spaces between tags
    
    const matchLeading = block.match(/^\n*/)?.[0] || '';
    const matchTrailing = block.match(/\n*$/)?.[0] || '';
    const core = block.substring(matchLeading.length, block.length - matchTrailing.length);
    
    let cleaned = core.replace(/^[ \t]+$/gm, '');
    cleaned = cleaned.replace(/\n{2,}/g, '\n');
    
    return matchLeading + cleaned + matchTrailing;
  });
  
  return processed.join('').replace(/\n{3,}/g, '\n\n').trim();
};
