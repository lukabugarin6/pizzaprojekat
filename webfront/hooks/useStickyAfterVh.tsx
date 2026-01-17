'use client';

import { useEffect, useState } from 'react';

export function useStickyAfterVh(vh = 1) {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const threshold = window.innerHeight * vh;
        setIsFixed(window.scrollY >= threshold);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [vh]);

  return isFixed;
}
