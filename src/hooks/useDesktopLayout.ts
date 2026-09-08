import { useEffect, useState } from 'react';

// Keep the layout decision aligned with the compact landscape rule in index.css.
const DESKTOP_QUERY = '(min-width: 721px) and (min-height: 521px), (min-width: 921px)';

export const useDesktopLayout = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia(DESKTOP_QUERY).matches
      : window.innerWidth > 720 && (window.innerHeight > 520 || window.innerWidth > 920),
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return isDesktop;
};
