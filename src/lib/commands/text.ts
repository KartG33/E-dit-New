export const collapseSpaces = (text: string): string => {
  return text.replace(/[ \t]+/g, ' ');
};

export const trimLines = (text: string): string => {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .join('\n');
};

export const toUpperCase = (text: string): string => text.toUpperCase();

export const lower = (text: string): string => text.toLowerCase();

export const sentence = (text: string): string => {
  return text.replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_match, prefix, char) => {
    return prefix + char.toUpperCase();
  });
};

export const removeSpaceBeforePunctuation = (text: string): string => {
  return text.replace(/\s+([.,;:!?])/g, '$1');
};

export const addSpaceAfterPunctuation = (text: string): string => {
  return text.replace(/([.,;:!?])(?=[^\s.,;:!?])/g, '$1 ');
};

export const line1 = (text: string): string => {
  let result = text.replace(/\r\n/g, '\n');
  result = result.replace(/^[ \t]+$/gm, '');
  return result.replace(/\n{3,}/g, '\n\n');
};

export const lineX = (text: string): string => {
  return text.replace(/^[ \t]*\r?\n/gm, '');
};

const processInline = (text: string, joinStr: string): string => {
  if (!text.trim()) return text;
  
  const normalized = text.replace(/\r\n/g, '\n');
  const cleaned = normalized.replace(/^[ \t]+$/gm, '');
  
  const paragraphs = cleaned.split(/\n{2,}/);
  
  const processed = paragraphs.map(p => {
    // Clean edges of each line before joining
    return p.split('\n').map(l => l.trim()).join(joinStr);
  });
  
  return processed.join('\n\n');
};

export const inline = (text: string): string => {
  return processInline(text, ' ');
};

export const inlineComma = (text: string): string => {
  return processInline(text, ', ');
};
