import * as diff from 'diff';

export type DiffResult = {
  value: string;
  count?: number;
  added?: boolean;
  removed?: boolean;
};

export const compareLines = (oldText: string, newText: string): DiffResult[] => {
  // Safe fallback for large documents to avoid blocking the UI
  // If combined length is > 200,000 characters, do a simple line-by-line quick check 
  // or use diff with a limited max computation time if available.
  // diffLines is generally fast, but we can do a quick check:
  if (oldText.length + newText.length > 200000) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    // Very basic fallback: just return the new text as added, and old as removed 
    // to avoid OOM or UI freezing, OR a fast linear scan for purely appended lines.
    // Let's do a simple linear scan from start and end.
    let startIdx = 0;
    while (startIdx < oldLines.length && startIdx < newLines.length && oldLines[startIdx] === newLines[startIdx]) {
      startIdx++;
    }
    
    let oldEndIdx = oldLines.length - 1;
    let newEndIdx = newLines.length - 1;
    while (oldEndIdx >= startIdx && newEndIdx >= startIdx && oldLines[oldEndIdx] === newLines[newEndIdx]) {
      oldEndIdx--;
      newEndIdx--;
    }
    
    const results: DiffResult[] = [];
    if (startIdx > 0) {
      results.push({ value: oldLines.slice(0, startIdx).join('\n') + '\n', count: startIdx });
    }
    if (oldEndIdx >= startIdx) {
      results.push({ value: oldLines.slice(startIdx, oldEndIdx + 1).join('\n') + '\n', count: oldEndIdx - startIdx + 1, removed: true });
    }
    if (newEndIdx >= startIdx) {
      results.push({ value: newLines.slice(startIdx, newEndIdx + 1).join('\n') + '\n', count: newEndIdx - startIdx + 1, added: true });
    }
    if (oldLines.length - 1 - oldEndIdx > 0) {
      results.push({ value: oldLines.slice(oldEndIdx + 1).join('\n'), count: oldLines.length - 1 - oldEndIdx });
    }
    return results;
  }
  
  return diff.diffLines(oldText, newText);
};
