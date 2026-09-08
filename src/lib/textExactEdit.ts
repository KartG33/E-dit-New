export const replaceAllExact = (text: string, search: string, replacement: string): string => {
  if (!search) return text;
  return text.split(search).join(replacement);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const removeAllExact = (text: string, fragments: string[]): string => {
  return removeExactWithCount(text, fragments).text;
};

export const removeExactWithCount = (text: string, fragments: string[]) => {
  const uniqueFragments = [...new Set(fragments.filter(fragment => fragment.length > 0))]
    .sort((left, right) => right.length - left.length);
  if (uniqueFragments.length === 0) return { text, count: 0 };

  const pattern = uniqueFragments.map(escapeRegExp).join('|');
  let count = 0;
  const result = text.replace(new RegExp(pattern, 'g'), () => { count++; return ''; });
  return { text: result, count };
};
