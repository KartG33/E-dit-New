import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import type { HistoryRecord } from '../../lib/db';
import { Clock, StickyNote } from 'lucide-react';
import { BackupRestore } from '../Backup/BackupRestore';

interface NotesSidebarProps {
  applyHistory: (text: string) => void;
}

export const NotesSidebar = ({ applyHistory }: NotesSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'notes'|'history'>('history');
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      db.history.orderBy('timestamp').reverse().limit(50).toArray().then(setHistory);
    }
  }, [activeTab]); // In a real app we'd also subscribe to live DB changes via useLiveQuery

  return (
    <div className="w-72 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden">
      <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-zinc-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
        ><Clock size={14}/> History</button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-white dark:bg-zinc-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
        ><StickyNote size={14}/> Notes</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 bg-zinc-50/50 dark:bg-zinc-950">
        {activeTab === 'history' && (
          <div className="flex flex-col gap-2">
            {history.map(record => (
              <div 
                key={record.id} 
                className="p-3 text-xs bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-blue-400 transition-colors shadow-sm" 
                onClick={() => applyHistory(record.text)}
                title="Click to load into active editor"
              >
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
                  <span className="capitalize bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{record.editorId}</span>
                </div>
                <div className="line-clamp-3 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                  {record.text || <span className="italic text-zinc-400">Empty</span>}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center text-zinc-500 p-4 text-sm mt-4">
                No history yet.
              </div>
            )}
          </div>
        )}
        {activeTab === 'notes' && (
          <textarea 
            className="w-full h-full p-2 resize-none outline-none bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 font-mono" 
            placeholder="Scratchpad for temporary notes..."
            spellCheck={false}
          />
        )}
        
        <BackupRestore />
      </div>
    </div>
  );
};
