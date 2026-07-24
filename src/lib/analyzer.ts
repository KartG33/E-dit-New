export interface TokenCount {
  token: string;
  count: number;
}

// Pure function to count symbols
export const analyzeSymbols = (text: string): TokenCount[] => {
  const counts: Record<string, number> = {};
  
  const add = (token: string, count: number) => {
    if (count > 0) {
      counts[token] = (counts[token] || 0) + count;
    }
  };

  // Replace text progressively to ensure longest match first.
  let remaining = text;

  const countAndRemove = (tokenStr: string, regex: RegExp, displayToken?: string) => {
    let matchCount = 0;
    remaining = remaining.replace(regex, () => {
      matchCount++;
      return ''; // remove it so it's not matched by shorter tokens
    });
    add(displayToken || tokenStr, matchCount);
  };

  // 1. Triple backticks
  countAndRemove('```', /```/g);
  // 2. Ellipsis
  countAndRemove('...', /\.\.\./g);
  // 3. Horizontal rules
  countAndRemove('---', /---/g);
  // 4. Double equals
  countAndRemove('==', /==/g);
  // 5. Bold/Italics
  countAndRemove('**', /\*\*/g);
  countAndRemove('__', /__/g);
  
  // 6. Numbered lists (e.g., "1. ", "2. ")
  countAndRemove('1.', /^\s*\d+\.\s/gm, 'List (1.)');
  
  // 7. Markdown & Punctuation
  const singleTokens = ['*', '_', '-', '#', '[', ']', '(', ')', '.', ',', '!', '?', ':', ';', '"', "'", '`', '>', '<', '=', '+', '/', '\\', '|', '{', '}', '~', '@', '$', '%', '^', '&'];
  
  for (const token of singleTokens) {
    // Escape for regex
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    countAndRemove(token, new RegExp(escaped, 'g'));
  }

  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count); // Most frequent first
};

export const removeTokenFromText = (text: string, token: string): string => {
  if (token === 'List (1.)') {
    return text.replace(/^\s*\d+\.\s/gm, '');
  }
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'g'), '');
};
