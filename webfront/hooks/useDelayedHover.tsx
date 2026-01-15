'use client';

import { useEffect, useRef, useState } from 'react';

export function useDelayedHover(delay = 700) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearHideTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearHideTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      timeoutRef.current = null;
    }, delay);
  };

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, []);

  return {
    isOpen,
    handleMouseEnter,
    handleMouseLeave,
  };
}
