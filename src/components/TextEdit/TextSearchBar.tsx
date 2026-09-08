import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { findTextMatches, type TextMatch } from '../../lib/textSearch';

interface Props {
  editorId: 'left' | 'right'; text: string;
  onReveal: (match: TextMatch | null) => void; onClose: () => void;
}
export function TextSearchBar({ editorId, text, onReveal, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [cursor, setCursor] = useState({ key: '', index: 0 });
  const matches = useMemo(() => findTextMatches(text, query, matchCase), [text, query, matchCase]);
  const key = JSON.stringify([editorId, query, matchCase, text]);
  const index = cursor.key === key ? Math.min(cursor.index, Math.max(0, matches.length - 1)) : 0;
  useEffect(() => { onReveal(matches[index] ?? null); }, [matches, index, onReveal]);
  const move = (delta: number) => {
    if (matches.length) setCursor({ key, index: (index + delta + matches.length) % matches.length });
  };
  return <div className="text-search-bar" role="search" aria-label={`Search ${editorId} editor`} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === 'Enter') { event.preventDefault(); move(event.shiftKey ? -1 : 1); }
  }}>
    <input autoFocus className="field-control" aria-label="Find in text" placeholder={`Find in ${editorId} editor`} value={query} onChange={event => setQuery(event.target.value)} />
    <label className="search-case" title="Match case"><input type="checkbox" aria-label="Match case" checked={matchCase} onChange={event => setMatchCase(event.target.checked)} />Aa</label>
    <span className="search-counter" role="status">{matches.length ? `${index + 1} of ${matches.length}` : query ? 'No matches' : '0 of 0'}</span>
    <button className="icon-button" aria-label="Previous match" title="Previous match (Shift+Enter)" disabled={!matches.length} onClick={() => move(-1)}><ArrowUp size={18} /></button>
    <button className="icon-button" aria-label="Next match" title="Next match (Enter)" disabled={!matches.length} onClick={() => move(1)}><ArrowDown size={18} /></button>
    <button className="icon-button" aria-label="Close search" title="Close search (Esc)" onClick={onClose}><X size={18} /></button>
  </div>;
}
