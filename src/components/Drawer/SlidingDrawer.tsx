import { useState, useEffect } from 'react';
import { Clock, HardDrive, X } from 'lucide-react';
import { db } from '../../lib/db';
import type { HistoryRecord } from '../../lib/db';
import { DataPanel } from '../Data/DataPanel';

export type DrawerTab = 'history' | 'data';

interface SlidingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  applyHistoryVersion: (text: string) => void;
}

export const SlidingDrawer = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  applyHistoryVersion
}: SlidingDrawerProps) => {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // Close drawer on Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Refresh history when drawer opens or history tab becomes active
  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      db.history.orderBy('timestamp').reverse().limit(50).toArray().then(setHistoryRecords);
    }
  }, [isOpen, activeTab]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
          onClick={onClose}
          data-testid="drawer-backdrop"
        />
      )}

      {/* Sliding Drawer Container */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="sliding-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
          <div className="flex items-center gap-1.5 font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            {activeTab === 'history' && <Clock size={16} className="text-blue-500" />}
            {activeTab === 'data' && <HardDrive size={16} className="text-emerald-500" />}
            <span>
              {activeTab === 'history' && 'История изменений'}
              {activeTab === 'data' && 'Data'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Закрыть"
            data-testid="drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/40 p-1 gap-1">
          <button
            onClick={() => onTabChange('history')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock size={13} /> History
          </button>
          <button
            onClick={() => onTabChange('data')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'data'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <HardDrive size={13} /> Data
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50 dark:bg-zinc-950/50">
          {activeTab === 'history' && (
            <div className="flex flex-col gap-2.5">
              {historyRecords.map(record => (
                <div 
                  key={record.id} 
                  className="p-3 text-xs bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-2xs group" 
                  onClick={() => {
                    applyHistoryVersion(record.text);
                    onClose();
                  }}
                  title="Нажмите, чтобы вставить в активный редактор"
                >
                  <div className="flex justify-between items-center text-zinc-400 mb-1.5 text-[11px]">
                    <span className="font-mono">{new Date(record.timestamp).toLocaleTimeString()}</span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                      {record.editorId} editor
                    </span>
                  </div>
                  <div className="line-clamp-4 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                    {record.text || <span className="italic text-zinc-400">Пустой текст</span>}
                  </div>
                </div>
              ))}
              {historyRecords.length === 0 && (
                <div className="text-center text-zinc-400 dark:text-zinc-500 py-8 text-xs">
                  История пока пуста.
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <DataPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
