import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db, type EditDatabase } from '../lib/db';
import type { ActionShortcuts } from '../lib/actionShortcuts';
import { notify } from '../lib/notifications';

export function useActionShortcuts(database: EditDatabase = db) {
  const [overrides, setOverrides] = useState<ActionShortcuts>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(() => database.getSetting('actionShortcuts')).subscribe({
      next: value => { setOverrides(value ?? {}); setLoaded(true); },
      error: () => notify('Failed to load keyboard shortcuts', true),
    });
    return () => subscription.unsubscribe();
  }, [database]);
  return { overrides, loaded };
}
