'use client';

import { useEffect, useState } from 'react';

export function useStickyAfterVh(vh = 1) {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const compute = () => {
      const threshold = window.innerHeight * vh;
      const next = window.scrollY >= threshold;

      setIsFixed((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [vh]);

  return isFixed;
}
