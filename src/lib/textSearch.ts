export interface TextMatch { start: number; end: number }

export function findTextMatches(text: string, query: string, matchCase = false): TextMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(text.matchAll(new RegExp(escaped, matchCase ? 'gu' : 'giu')),
    match => ({ start: match.index, end: match.index + match[0].length }));
}

/** Measure wrapped lines using the editor's own typography without changing its text. */
export function revealTextRange(editor: HTMLTextAreaElement, match: TextMatch, focus = false) {
  if (focus) editor.focus({ preventScroll: true });
  editor.setSelectionRange(match.start, match.end);
  const style = getComputedStyle(editor);
  const mirror = document.createElement('div');
  for (const key of ['font', 'letterSpacing', 'lineHeight', 'padding', 'border', 'boxSizing', 'tabSize'] as const) {
    mirror.style[key] = style[key];
  }
  Object.assign(mirror.style, {
    position: 'fixed', visibility: 'hidden', pointerEvents: 'none', left: '-10000px',
    width: `${editor.clientWidth}px`, border: '0', whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
  });
  mirror.textContent = editor.value.slice(0, match.start);
  const marker = document.createElement('span');
  marker.textContent = editor.value.slice(match.start, match.end) || '\u200b';
  mirror.append(marker);
  document.body.append(mirror);
  const top = marker.offsetTop;
  editor.scrollTop = Math.max(0, top - editor.clientHeight / 2);
  mirror.remove();
}
