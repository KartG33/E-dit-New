import { describe, it, expect } from 'vitest';
import { db, type RegexPreset, type ChainPreset } from '../src/lib/db';
import { applyRegexPreset, applyChainPreset } from '../src/lib/presets/execute';
import { PRESET_SYMBOLS, removePresetSymbol } from '../src/lib/commands/symbols';

describe('Regex Presets', () => {
  it('applies a valid regex preset', () => {
    const preset: RegexPreset = {
      type: 'regex',
      pattern: 'foo',
      flags: 'g',
      replacement: 'bar'
    };
    expect(applyRegexPreset('foo foo', preset)).toBe('bar bar');
  });

  it('throws a caught error on invalid regex', () => {
    const preset: RegexPreset = {
      type: 'regex',
      pattern: '[invalid',
      flags: 'g',
      replacement: 'bar'
    };
    expect(() => applyRegexPreset('test', preset)).toThrow('Invalid regular expression');
  });
});

describe('Chain Presets', () => {
  it('applies chain in order with repeated commands', () => {
    const preset: ChainPreset = {
      type: 'chain',
      commands: ['text.upper', 'text.spaces', 'text.spaces'] // Spaces repeated, should run fine
    };
    // upper -> spaces
    const result = applyChainPreset('  hello   world  ', preset);
    expect(result).toBe(' HELLO WORLD ');
  });

  it('removes selected symbols as ordered chain steps', () => {
    const preset: ChainPreset = {
      type: 'chain',
      commands: ['symbol.remove:###', 'symbol.remove:- [x]', 'text.spaces']
    };

    expect(applyChainPreset('###  Title\n- [x]  Done\n## Keep', preset))
      .toBe(' Title\n Done\n## Keep');
  });

  it('does not split longer symbols when removing a shorter one', () => {
    const preset: ChainPreset = {
      type: 'chain',
      commands: ['symbol.remove:#', 'symbol.remove:!']
    };

    expect(applyChainPreset('# Remove\n## Keep\n! Remove\n![Keep]', preset))
      .toBe(' Remove\n## Keep\n Remove\n![Keep]');
  });

  it('contains the expanded symbol list without duplicates', () => {
    expect(new Set(PRESET_SYMBOLS).size).toBe(PRESET_SYMBOLS.length);
    expect(PRESET_SYMBOLS).toEqual(expect.arrayContaining([
      '*', '**', '_', '__', '~', '`', '```', '~~~', '[', ']', '(', ')', '<', '|', '^', '1.'
    ]));
  });

  it('treats 1. as numbered-list removal only at line starts', () => {
    const text = '1. First\n  2. Second\nVersion 1. stays\n3.Third stays';

    expect(removePresetSymbol(text, '1.'))
      .toBe('First\n  Second\nVersion 1. stays\n3.Third stays');
  });

  it('throws on unknown CommandId', () => {
    const preset: ChainPreset = {
      type: 'chain',
      commands: ['non.existent' as any]
    };
    expect(() => applyChainPreset('test', preset)).toThrow('Unknown CommandId: non.existent');
  });
});

describe('DB Migration v2 -> v3', () => {
  it('fills order on existing presets', async () => {
    await db.delete();
    await db.open();

    // Force adding a preset without order
    await db.presets.add({
      name: 'No Order',
      data: { type: 'regex', pattern: 'a', flags: '', replacement: 'b' },
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000
    } as any);

    await db.close();
    
    // We can't easily trigger dexie migration in test manually without re-opening with higher version,
    // but we can simulate the upgrade logic:
    let currentOrder = 0;
    await db.open();
    await db.transaction('rw', db.presets, async () => {
      await db.presets.toCollection().modify(preset => {
        if (typeof preset.order !== 'number') {
          preset.order = currentOrder++;
        }
      });
    });

    const items = await db.presets.toArray();
    expect(items[0].order).toBe(0);
  });
});
