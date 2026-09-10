import { useEffect } from 'react';

/** The native window stays full-height while the keyboard overlays its content. */
export function useAndroidViewport() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      root.style.setProperty('--app-viewport-height', `${root.clientHeight || window.innerHeight}px`);
      root.style.setProperty('--app-viewport-offset-top', '0px');
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-offset-top');
    };
  }, []);
}
