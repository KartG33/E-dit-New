import { useState, useEffect } from 'react';

export interface SymbolStats {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  lines: number;
}

export const useSymbolAnalyzer = (text: string, delay: number = 300) => {
  const [stats, setStats] = useState<SymbolStats>({
    characters: 0,
    charactersWithoutSpaces: 0,
    words: 0,
    lines: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        characters: text.length,
        charactersWithoutSpaces: text.replace(/\s/g, '').length,
        words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
        lines: text === '' ? 0 : text.split('\n').length,
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  return stats;
};
