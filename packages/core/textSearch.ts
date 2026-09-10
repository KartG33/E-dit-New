export interface TextMatch { start: number; end: number }

export function findTextMatches(text: string, query: string, matchCase = false): TextMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(text.matchAll(new RegExp(escaped, matchCase ? 'gu' : 'giu')),
    match => ({ start: match.index, end: match.index + match[0].length }));
}

