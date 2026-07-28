import { useState } from 'react';
import { db } from '../../lib/db';
import { DATA_FILE_VERSION, importDataFile } from '../../lib/data/import';

export const DataPanel = () => {
  const [msg, setMsg] = useState('');

  const handleExport = async () => {
    try {
      const presets = await db.presets.toArray();
      const settings = await db.settings.toArray();
      
      const dataPayload = {
        version: DATA_FILE_VERSION,
        presets,
        settings,
        timestamp: Date.now()
      };
      
      const blob = new Blob([JSON.stringify(dataPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edit-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('Export successful');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      await importDataFile(text);
      
      setMsg('Import successful. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMsg(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Data</h3>
      <div className="flex gap-2">
        <button 
          onClick={handleExport}
          className="flex-1 py-1 px-2 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          Export
        </button>
        <label className="flex-1 py-1 px-2 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors text-center cursor-pointer">
          Import
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {msg && <div className="text-xs text-blue-500 font-medium mt-1">{msg}</div>}
    </div>
  );
};
