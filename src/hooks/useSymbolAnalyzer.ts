import { useState, useEffect } from 'react';
import { analyzeSymbols, type TokenCount } from '../lib/analyzer';

export interface SymbolStats {
  characters: number;
  lines: number;
  tokens: TokenCount[];
}

export const useSymbolAnalyzer = (text: string, delay: number = 300) => {
  const [stats, setStats] = useState<SymbolStats>({
    characters: 0,
    lines: 0,
    tokens: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        characters: text.length,
        lines: text === '' ? 0 : text.split('\n').length,
        tokens: analyzeSymbols(text),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  return stats;
};
