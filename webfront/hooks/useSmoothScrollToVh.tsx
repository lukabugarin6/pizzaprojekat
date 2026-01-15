// hooks/useSmoothScrollToVh.ts
import { useCallback } from 'react';

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export function useSmoothScrollToVh(duration = 750, vhMultiplier = 1) {
  return useCallback(() => {
    if (typeof window === 'undefined') return;

    const start = window.scrollY;
    const target = window.innerHeight * vhMultiplier;
    const distance = target - start;

    let startTime: number | null = null;

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);

      window.scrollTo(0, start + distance * eased);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, [duration, vhMultiplier]);
}
