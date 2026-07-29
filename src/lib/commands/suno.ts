// Suno Commands

const SUNO_STRUCTURAL_TAGS = [
  'intro', 'verse', 'pre-chorus', 'prechorus', 'chorus', 'bridge',
  'hook', 'refrain', 'break', 'drop', 'interlude', 'solo',
  'fade out', 'fadeout', 'outro'
];

export interface GroupedSunoTag {
  tag: string;
  count: number;
}

export const groupSunoTags = (text: string): GroupedSunoTag[] => {
  const groups = new Map<string, GroupedSunoTag>();

  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    const tag = match[1].trim();
    if (!tag) continue;

    const existing = groups.get(tag);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(tag, { tag, count: 1 });
    }
  }

  return Array.from(groups.values());
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
