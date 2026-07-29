import { useState } from 'react';
import { db } from '../../lib/db';
import { DATA_FILE_VERSION, importDataFile } from '../../lib/data/import';
import {
  browserDataFileAdapter,
  type DataFileAdapter,
} from '../../lib/platform/dataFileAdapter';

interface DataPanelProps {
  fileAdapter?: DataFileAdapter;
}

export const DataPanel = ({ fileAdapter = browserDataFileAdapter }: DataPanelProps) => {
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
      
      await fileAdapter.saveFile({
        fileName: `edit-data-${new Date().toISOString().split('T')[0]}.json`,
        contents: JSON.stringify(dataPayload, null, 2),
        mediaType: 'application/json',
      });
      setMsg('Export successful');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Export failed');
    }
  };

  const handleImport = async () => {
    try {
      const file = await fileAdapter.selectFile({ accept: ['application/json', '.json'] });
      if (!file) return;
      const text = await fileAdapter.readFile(file);
      await importDataFile(text);
      
      setMsg('Import successful. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMsg(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="data-panel">
      <h3 className="section-eyebrow">Data</h3>
      <div className="data-actions">
        <button 
          onClick={handleExport}
          className="data-button"
        >
          Export
        </button>
        <button
          onClick={handleImport}
          className="data-button"
        >
          Import
        </button>
      </div>
      {msg && <div className="status-message">{msg}</div>}
    </div>
  );
};
