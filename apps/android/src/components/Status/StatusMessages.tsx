import { useEffect, useState } from 'react';
import { flushEditors } from '../../lib/editorPersistence';

export const StatusMessages = () => {
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const onNotice = (event: Event) => setNotice({ text: String((event as CustomEvent).detail) });
    const onError = (event: Event) => setError(String((event as CustomEvent).detail));
    window.addEventListener('app-notice', onNotice);
    window.addEventListener('app-error', onError);
    return () => {
      window.removeEventListener('app-notice', onNotice);
      window.removeEventListener('app-error', onError);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  return <div className="app-messages">
    {error && <div className="app-message is-error" role="alert">
      <span>{error}</span>
      {/Failed to save (left|right) editor|Recovery storage/.test(error) && <button onClick={() => { void flushEditors().then(() => setError('')).catch(() => undefined); }}>Retry save</button>}
      <button aria-label="Dismiss error" onClick={() => setError('')}>×</button>
    </div>}
    {!error && notice && <div className="app-message" role="status">{notice.text}</div>}
  </div>;
};
