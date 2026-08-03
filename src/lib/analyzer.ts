export interface TokenCount {
  token: string;
  count: number;
}

export interface TokenSpec {
  name: string;
  getRegex: () => RegExp;
  remove: (text: string) => string;
}

const COMPOUND_TOKENS = [
  { name: '<!--', regexStr: '<!--' },
  { name: '-->', regexStr: '-->' },
  { name: '```', regexStr: '```' },
  { name: '~~~', regexStr: '~~~' },
  { name: '- [ ]', regexStr: '- \\[ \\]' },
  { name: '- [x]', regexStr: '- \\[x\\]' },
  { name: '- [X]', regexStr: '- \\[X\\]' },
  { name: '######', regexStr: '######' },
  { name: '#####', regexStr: '#####' },
  { name: '####', regexStr: '####' },
  { name: '###', regexStr: '###' },
  { name: '##', regexStr: '##' },
  { name: '...', regexStr: '\\.\\.\\.' },
  { name: '---', regexStr: '---' },
  { name: '***', regexStr: '\\*\\*\\*' },
  { name: '___', regexStr: '___' },
  { name: '===', regexStr: '===' },
  { name: ':-:', regexStr: ':-:' },
  { name: '==', regexStr: '==' },
  { name: '**', regexStr: '\\*\\*' },
  { name: '__', regexStr: '__' },
  { name: '~~', regexStr: '~~' },
  { name: '>>', regexStr: '>>' },
  { name: '![', regexStr: '!\\[' },
  { name: '[^', regexStr: '\\[\\^' },
  { name: '^[', regexStr: '\\^\\[' },
  { name: ':-', regexStr: ':-' },
  { name: '-:', regexStr: '-:' },
];

const SINGLE_PUNCTUATION = [
  '*', '_', '-', '#', '[', ']', '(', ')', '.', ',', '!', '?', ':', ';', '"', "'", '`', '>', '<', '=', '+', '/', '\\', '|', '{', '}', '~', '@', '$', '%', '^', '&'
];

export const TOKEN_REGISTRY: TokenSpec[] = [
  ...COMPOUND_TOKENS.map(t => ({
    name: t.name,
    getRegex: () => new RegExp(t.regexStr, 'g'),
    remove: (text: string) => text.replace(new RegExp(t.regexStr, 'g'), '')
  })),
  {
    name: 'List (1.)',
    getRegex: () => /^[ \t]*\d+\.[ \t]+/gm,
    remove: (text: string) => text.replace(/^([ \t]*)\d+\.[ \t]+/gm, '$1')
  },
  ...SINGLE_PUNCTUATION.map(token => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isSelfRepeating = ['-', '*', '_', '=', '.', '`'].includes(token);
    const pattern = isSelfRepeating ? `(?<!${escaped})${escaped}(?!${escaped})` : escaped;
    return {
      name: token,
      getRegex: () => new RegExp(pattern, 'g'),
      remove: (text: string) => text.replace(new RegExp(pattern, 'g'), '')
    };
  })
];

export const analyzeSymbols = (text: string): TokenCount[] => {
  const counts: Record<string, number> = {};
  let remaining = text;

  for (const spec of TOKEN_REGISTRY) {
    const regex = spec.getRegex();
    let matchCount = 0;
    remaining = remaining.replace(regex, () => {
      matchCount++;
      return '';
    });
    if (matchCount > 0) {
      counts[spec.name] = (counts[spec.name] || 0) + matchCount;
    }
  }

  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count);
};

export const removeTokenFromText = (text: string, tokenName: string): string => {
  const spec = TOKEN_REGISTRY.find(t => t.name === tokenName);
  if (spec) {
    return spec.remove(text);
  }
  return text;
};
