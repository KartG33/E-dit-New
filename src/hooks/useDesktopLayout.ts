import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 721px)';

export const useDesktopLayout = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia(DESKTOP_QUERY).matches
      : window.innerWidth > 720,
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
