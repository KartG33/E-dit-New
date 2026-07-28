import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, EditDatabase } from '../src/lib/db';
import Dexie from 'dexie';

describe('Database & Migrations', () => {
  beforeEach(async () => {
    await db.history.clear();
    await db.presets.clear();
    await db.settings.clear();
  });

  it('enforces max history records per editor independently', async () => {
    // Add 60 to 'left' and 60 to 'right'
    for (let i = 0; i < 60; i++) {
      await db.addHistory({ editorId: 'left', text: `Left ${i}`, timestamp: Date.now() + i }, 50);
      await db.addHistory({ editorId: 'right', text: `Right ${i}`, timestamp: Date.now() + i }, 50);
    }

    const leftCount = await db.history.where('editorId').equals('left').count();
    const rightCount = await db.history.where('editorId').equals('right').count();
    
    expect(leftCount).toBe(50);
    expect(rightCount).toBe(50);
    
    // Check if oldest were removed from 'left'
    const leftAll = await db.history.where('editorId').equals('left').sortBy('timestamp');
    expect(leftAll[0].text).toBe('Left 10');
  });

  it('performs V1 to V2 migration', async () => {
    // Simulate V1 Database
    const v1Db = new Dexie('MigrationTestDB');
    v1Db.version(1).stores({
      presets: '++id, name, isFavorite, createdAt'
    });
    
    await v1Db.open();
    // Add a preset without updatedAt (as it would be in v1)
    await v1Db.table('presets').add({
      name: 'V1 Preset',
      isFavorite: false,
      data: { type: 'chain', commands: ['Spaces'] },
      createdAt: 1000000
    });
    v1Db.close();

    // Now open with V2 Schema using our actual Database class
    const v2Db = new EditDatabase('MigrationTestDB');
    await v2Db.open();
    
    const presets = await v2Db.presets.toArray();
    expect(presets.length).toBe(1);
    expect(presets[0].updatedAt).toBe(1000000); // Should be migrated to equal createdAt
    
    await v2Db.delete(); // cleanup
  });

  it('removes notes while preserving current data during V3 to V4 migration', async () => {
    const databaseName = 'NotesRemovalMigrationTestDB';
    const v3Db = new Dexie(databaseName);
    v3Db.version(3).stores({
      notes: '++id, title, *tags, createdAt, updatedAt',
      history: '++id, editorId, timestamp',
      presets: '++id, name, isFavorite, createdAt, updatedAt, order',
      settings: 'key'
    });

    await v3Db.open();
    await v3Db.table('notes').add({
      title: 'Legacy note',
      text: 'This should be removed',
      tags: ['legacy'],
      createdAt: 100,
      updatedAt: 200
    });
    await v3Db.table('history').add({
      text: 'Preserved history',
      editorId: 'left',
      timestamp: 300
    });
    await v3Db.table('presets').add({
      name: 'Preserved preset',
      data: { type: 'chain', commands: ['text.spaces'] },
      isFavorite: true,
      createdAt: 400,
      updatedAt: 500,
      order: 0
    });
    await v3Db.table('settings').add({ key: 'theme', value: 'dark' });
    v3Db.close();

    const currentDb = new EditDatabase(databaseName);
    await currentDb.open();

    expect(currentDb.tables.map(table => table.name)).not.toContain('notes');
    expect(() => currentDb.table('notes')).toThrow();
    await expect(currentDb.history.toArray()).resolves.toMatchObject([
      { text: 'Preserved history', editorId: 'left', timestamp: 300 }
    ]);
    await expect(currentDb.presets.toArray()).resolves.toMatchObject([
      {
        name: 'Preserved preset',
        data: { type: 'chain', commands: ['text.spaces'] },
        isFavorite: true,
        createdAt: 400,
        updatedAt: 500,
        order: 0
      }
    ]);
    await expect(currentDb.settings.toArray()).resolves.toEqual([
      { key: 'theme', value: 'dark' }
    ]);

    await currentDb.delete();
  });
});
