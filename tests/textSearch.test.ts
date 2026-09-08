import { describe, it, expect } from 'vitest';
import { findTextMatches } from '../src/lib/textSearch';
describe('literal text search', () => {
  it('finds repeated tags literally, with original Unicode positions', () => {
    expect(findTextMatches('emoji: \u{1f600} [tag] [TAG]', '[tag]')).toEqual([{ start: 10, end: 15 }, { start: 16, end: 21 }]);
    expect(findTextMatches('[tag] [TAG]', '[tag]', true)).toEqual([{ start: 0, end: 5 }]);
  });
  it('does not treat punctuation as a regex and ignores an empty query', () => {
    expect(findTextMatches('a.*b.*', '.*')).toEqual([{ start: 1, end: 3 }, { start: 4, end: 6 }]);
    expect(findTextMatches('abc', '')).toEqual([]);
  });
});
