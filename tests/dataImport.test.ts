import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditDatabase } from '../src/lib/db';
import { DataImportError, importDataFile, parseDataFile } from '../src/lib/data/import';

const validData = () => ({
  version: 2,
  timestamp: 123456,
  presets: [
    {
      id: 10,
      name: 'Imported chain',
      data: { type: 'chain', commands: ['text.upper', 'text.spaces'] },
      isFavorite: true,
      createdAt: 100,
      updatedAt: 200,
      order: 0,
    },
    {
      id: 11,
      name: 'Imported regex',
      data: { type: 'regex', pattern: 'foo', flags: 'gi', replacement: 'bar' },
      isFavorite: false,
      createdAt: 300,
      updatedAt: 400,
    },
  ],
  settings: [
    { key: 'theme', value: 'dark' },
    { key: 'dualMode', value: true },
    { key: 'activeEditor', value: 'right' },
    { key: 'startupTab', value: 'Favorites' },
    { key: 'editorLeftText', value: 'Left text' },
    { key: 'editorRightText', value: 'Right text' },
    { key: 'favoriteCommandIds', value: ['text.upper', 'suno.clean'] },
  ],
});

describe('Data v2 import', () => {
  let database: EditDatabase;

  beforeEach(async () => {
    database = new EditDatabase(`DataImportTest-${crypto.randomUUID()}`);
    await database.open();
    await database.presets.add({
      name: 'Existing preset',
      data: { type: 'chain', commands: ['text.lower'] },
      isFavorite: false,
      createdAt: 1,
      updatedAt: 1,
      order: 0,
    });
    await database.settings.add({ key: 'theme', value: 'light' });
  });

  afterEach(async () => {
    await database.delete();
  });

  it('validates and imports the complete Data v2 payload', async () => {
    await importDataFile(JSON.stringify(validData()), database);

    await expect(database.presets.orderBy('id').toArray()).resolves.toMatchObject([
      { id: 10, name: 'Imported chain' },
      { id: 11, name: 'Imported regex' },
    ]);
    const importedSettings = await database.settings.toArray();
    expect(importedSettings).toHaveLength(validData().settings.length);
    expect(importedSettings).toEqual(expect.arrayContaining(validData().settings));
  });

  it.each([
    ['invalid JSON', '{', 'File is not valid JSON'],
    ['unsupported version', { ...validData(), version: 3 }, 'Unsupported Data version: 3'],
    [
      'invalid setting',
      { ...validData(), settings: [{ key: 'theme', value: 'blue' }] },
      'settings[0].value is invalid for setting "theme"',
    ],
    [
      'invalid chain command',
      {
        ...validData(),
        presets: [{ ...validData().presets[0], data: { type: 'chain', commands: ['unknown.command'] } }],
      },
      'presets[0].data.commands[0] is not a known CommandId',
    ],
    [
      'invalid regex',
      {
        ...validData(),
        presets: [{ ...validData().presets[1], data: { type: 'regex', pattern: '[', flags: '', replacement: '' } }],
      },
      'presets[0].data contains an invalid regular expression',
    ],
    [
      'missing presets',
      { version: 2, timestamp: 1, settings: [] },
      'presets must be an array',
    ],
  ])('rejects %s before changing saved data', async (_case, payload, message) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);

    await expect(importDataFile(text, database)).rejects.toThrow(message);
    await expect(database.presets.toArray()).resolves.toMatchObject([{ name: 'Existing preset' }]);
    await expect(database.settings.toArray()).resolves.toEqual([{ key: 'theme', value: 'light' }]);
  });

  it('rolls back both tables if a write fails inside the import transaction', async () => {
    const writeFailure = vi
      .spyOn(database.settings, 'bulkAdd')
      .mockRejectedValueOnce(new Error('Simulated write failure'));

    await expect(importDataFile(JSON.stringify(validData()), database)).rejects.toThrow(
      'Simulated write failure',
    );
    writeFailure.mockRestore();

    await expect(database.presets.toArray()).resolves.toMatchObject([{ name: 'Existing preset' }]);
    await expect(database.settings.toArray()).resolves.toEqual([{ key: 'theme', value: 'light' }]);
  });

  it('returns a dedicated, understandable validation error', () => {
    expect(() => parseDataFile(JSON.stringify({ ...validData(), settings: 'invalid' }))).toThrow(
      DataImportError,
    );
  });
});
