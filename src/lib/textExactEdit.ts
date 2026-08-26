export const replaceAllExact = (text: string, search: string, replacement: string): string => {
  if (!search) return text;
  return text.split(search).join(replacement);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const removeAllExact = (text: string, fragments: string[]): string => {
  const uniqueFragments = [...new Set(fragments.filter(fragment => fragment.length > 0))]
    .sort((left, right) => right.length - left.length);
  if (uniqueFragments.length === 0) return text;

  const pattern = uniqueFragments.map(escapeRegExp).join('|');
  return text.replace(new RegExp(pattern, 'g'), '');
};
