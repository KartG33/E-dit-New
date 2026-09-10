export const Clipboard = {
  async read() { return { value: await navigator.clipboard.readText() }; },
  async write({ string }: { string: string; label?: string }) { await navigator.clipboard.writeText(string); },
};
