import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db, type EditDatabase, type Preset } from '../lib/db';

const sortPresets = (presets: Preset[]) => [...presets].sort((left, right) => {
  const orderDifference = (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDifference !== 0) return orderDifference;
  return left.createdAt - right.createdAt;
});

export const usePresets = (database: EditDatabase = db) => {
  const [presets, setPresets] = useState<Preset[] | null>(null);

  useEffect(() => {
    const subscription = liveQuery(() => database.presets.toArray()).subscribe({
      next: items => setPresets(sortPresets(items)),
      error: () => setPresets([]),
    });

    return () => subscription.unsubscribe();
  }, [database]);

  return {
    presets: presets ?? [],
    isLoading: presets === null,
  };
};
