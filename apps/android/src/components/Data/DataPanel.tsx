import { useState } from 'react';
import { db } from '../../lib/db';
import { DATA_FILE_VERSION, importDataFile, parseDataFile } from '../../lib/data/import';
import { flushEditors, importWithEditors } from '../../lib/editorPersistence';
import {
  type DataFileAdapter,
} from '../../lib/platform/dataFileAdapter';
import { defaultDataFileAdapter } from '../../lib/platform/defaultDataFileAdapter';

interface DataPanelProps {
  fileAdapter?: DataFileAdapter;
}

export const DataPanel = ({ fileAdapter = defaultDataFileAdapter }: DataPanelProps) => {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await flushEditors();
      const [presets, settings] = await db.transaction('r', db.presets, db.settings,
        () => Promise.all([db.presets.toArray(), db.settings.toArray()]));

      const dataPayload = {
        version: DATA_FILE_VERSION,
        presets,
        settings,
        timestamp: Date.now()
      };

      const result = await fileAdapter.saveFile({
        fileName: `edit-data-${new Date().toISOString().split('T')[0]}.json`,
        contents: JSON.stringify(dataPayload, null, 2),
        mediaType: 'application/json',
      });
      if (result === 'cancelled') return;
      setMsg('Export successful');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Export failed');
    } finally { setBusy(false); }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = await fileAdapter.selectFile({ accept: ['application/json', '.json'] });
      if (!file) return;
      const text = await fileAdapter.readFile(file);
      parseDataFile(text);
      await importWithEditors(() => importDataFile(text));

      setMsg('Import successful');
    } catch (error) {
      setMsg(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="data-panel">
      <h3 className="section-eyebrow">Data</h3>
      <div className="data-actions">
        <button
          onClick={handleExport}
          disabled={busy}
          className="data-button"
        >
          Export
        </button>
        <button
          onClick={handleImport}
          disabled={busy}
          className="data-button"
        >
          Import
        </button>
      </div>
      {msg && <div className="status-message">{msg}</div>}
    </div>
  );
};
