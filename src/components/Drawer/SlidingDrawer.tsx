import { useState, useEffect, useMemo } from 'react';
import { liveQuery } from 'dexie';
import { Clock, X } from 'lucide-react';
import { db } from '../../lib/db';
import type { HistoryRecord } from '../../lib/db';
import { useDialog } from '../../hooks/useDialog';
import { notify } from '../../lib/notifications';

interface SlidingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  applyHistoryVersion: (text: string) => void;
}

export const SlidingDrawer = ({
  isOpen,
  onClose,
  applyHistoryVersion
}: SlidingDrawerProps) => {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'left' | 'right'>('all');
  const [loading, setLoading] = useState(true);
  const visibleRecords = useMemo(() => historyRecords.filter(record =>
    (filter === 'all' || record.editorId === filter) && record.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  ), [historyRecords, query, filter]);
  const { dialogRef, backdropProps } = useDialog(onClose, isOpen);

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

  // Refresh history when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    const subscription = liveQuery(() => db.history.orderBy('timestamp').reverse().toArray()).subscribe({
      next: records => { setHistoryRecords(records); setLoading(false); },
      error: () => { setLoading(false); notify('Failed to load history', true); },
    });
    return () => subscription.unsubscribe();
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="drawer-backdrop"
          {...backdropProps}
          data-testid="drawer-backdrop"
        />
      )}

      {/* Sliding Drawer Container */}
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        className={`drawer ${isOpen ? 'is-open' : ''}`}
        data-testid="sliding-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="History"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <Clock size={16} className="text-blue-500" />
            <span>История изменений</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button drawer-close-button window-close-button"
            aria-label="Close History"
            title="Закрыть"
            data-testid="drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="history-search">
          <input className="field-control" aria-label="Search history" placeholder="Search full text" value={query} onChange={event => setQuery(event.target.value)} />
          <select className="field-control" aria-label="History editor filter" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
            <option value="all">All editors</option><option value="left">Left editor</option><option value="right">Right editor</option>
          </select>
          <span role="status">{loading ? 'Loading...' : `${visibleRecords.length} versions`}</span>
        </div>
        <div className="drawer-body">
          <div className="history-list">
              {visibleRecords.map(record => (
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
                    <time className="font-mono" dateTime={new Date(record.timestamp).toISOString()}>{new Date(record.timestamp).toLocaleString()}</time>
                    <span className="history-badge">
                      {record.editorId} editor
                    </span>
                  </div>
                  <div className="history-preview">
                    {record.text || <span className="italic">Пустой текст</span>}
                  </div>
                </button>
              ))}
              {!loading && visibleRecords.length === 0 && (
                <div className="drawer-empty">
                  {historyRecords.length === 0 ? 'История пока пуста.' : 'No matching versions.'}
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};
