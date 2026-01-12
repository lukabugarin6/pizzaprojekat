// hooks/useFadeInOnView.ts
'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

export function useFadeInOnView({
  threshold = 0.2,
  rootMargin = '0px',
  once = true,
}: Options = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
