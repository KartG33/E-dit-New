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
          className="drawer-backdrop"
          onClick={onClose}
          data-testid="drawer-backdrop"
        />
      )}

      {/* Sliding Drawer Container */}
      <div
        className={`drawer ${isOpen ? 'is-open' : ''}`}
        data-testid="sliding-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="History and Data"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            {activeTab === 'history' && <Clock size={16} className="text-blue-500" />}
            {activeTab === 'data' && <HardDrive size={16} className="text-emerald-500" />}
            <span>
              {activeTab === 'history' && 'История изменений'}
              {activeTab === 'data' && 'Data'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button drawer-close-button window-close-button"
            aria-label="Close History and Data"
            title="Закрыть"
            data-testid="drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="drawer-tabs">
          <button
            onClick={() => onTabChange('history')}
            aria-pressed={activeTab === 'history'}
            className={`drawer-tab ${activeTab === 'history' ? 'is-active' : ''}`}
          >
            <Clock size={13} /> History
          </button>
          <button
            onClick={() => onTabChange('data')}
            aria-pressed={activeTab === 'data'}
            className={`drawer-tab ${activeTab === 'data' ? 'is-active' : ''}`}
          >
            <HardDrive size={13} /> Data
          </button>
        </div>

        {/* Content Body */}
        <div className="drawer-body">
          {activeTab === 'history' && (
            <div className="history-list">
              {historyRecords.map(record => (
                <button
                  type="button"
                  key={record.id}
                  className="history-card"
                  onClick={() => {
                    applyHistoryVersion(record.text);
                    onClose();
                  }}
                  title="Нажмите, чтобы вставить в активный редактор"
                >
                  <div className="history-meta">
                    <span className="font-mono">{new Date(record.timestamp).toLocaleTimeString()}</span>
                    <span className="history-badge">
                      {record.editorId} editor
                    </span>
                  </div>
                  <div className="history-preview">
                    {record.text || <span className="italic">Пустой текст</span>}
                  </div>
                </button>
              ))}
              {historyRecords.length === 0 && (
                <div className="drawer-empty">
                  История пока пуста.
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="drawer-panel">
              <DataPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
