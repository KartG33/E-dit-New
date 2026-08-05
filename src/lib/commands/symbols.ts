export const PRESET_SYMBOLS = [
  '#',
  '##',
  '###',
  '####',
  '#####',
  '######',
  '*',
  '**',
  '***',
  '_',
  '__',
  '___',
  '~',
  '~~',
  '-',
  '---',
  '+',
  '1.',
  '>',
  '>>',
  '`',
  '```',
  '~~~',
  '[',
  ']',
  '(',
  ')',
  '![',
  '<',
  '\\',
  '|',
  ':-',
  '-:',
  ':-:',
  '[^',
  '^[',
  '==',
  '===',
  '^',
  '- [ ]',
  '- [x]',
  '- [X]',
  '<!--',
  '-->',
  '...',
  '.',
  ',',
  '!',
  '?',
  ':',
  ';',
  '"',
  "'",
  '/',
  '{',
  '}',
  '@',
  '$',
  '%',
  '&',
] as const;

export type PresetSymbol = typeof PRESET_SYMBOLS[number];
export type SymbolCommandId = `symbol.remove:${PresetSymbol}`;

export const getSymbolCommandId = (symbol: PresetSymbol): SymbolCommandId =>
  `symbol.remove:${symbol}`;

const SYMBOLS_LONGEST_FIRST = [...PRESET_SYMBOLS]
  .sort((left, right) => right.length - left.length);

export const removePresetSymbol = (text: string, symbolToRemove: PresetSymbol): string => {
  if (symbolToRemove === '1.') {
    return text.replace(/^([ \t]*)\d+\.[ \t]+/gm, '$1');
  }

  let result = '';
  let position = 0;

  while (position < text.length) {
    const matchedSymbol = SYMBOLS_LONGEST_FIRST
      .find(symbol => text.startsWith(symbol, position));

    if (matchedSymbol) {
      if (matchedSymbol !== symbolToRemove) result += matchedSymbol;
      position += matchedSymbol.length;
      continue;
    }

    result += text[position];
    position += 1;
  }

  return result;
};

export const SYMBOL_COMMAND_REGISTRY = Object.fromEntries(
  PRESET_SYMBOLS.map(symbol => [
    getSymbolCommandId(symbol),
    (text: string) => removePresetSymbol(text, symbol),
  ]),
) as Record<SymbolCommandId, (text: string) => string>;

export const isSymbolCommandId = (commandId: string): commandId is SymbolCommandId =>
  commandId in SYMBOL_COMMAND_REGISTRY;

export const getSymbolFromCommandId = (commandId: SymbolCommandId): PresetSymbol =>
  commandId.slice('symbol.remove:'.length) as PresetSymbol;
