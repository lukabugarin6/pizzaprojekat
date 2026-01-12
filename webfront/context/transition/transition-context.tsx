'use client';

import { createContext, useContext, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type ContextType = {
  navigate: (href: string) => void;
  isTransitioning: boolean;
};

const TransitionContext = createContext<ContextType | null>(null);

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  const navigate = (href: string) => {
    if (isTransitioning) return;

    pendingRoute.current = href;
    setIsTransitioning(true);
  };

  return (
    <TransitionContext.Provider value={{ navigate, isTransitioning }}>
      {children}
    </TransitionContext.Provider>
  );
}

export const useTransitionNav = () => {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error('useTransitionNav must be used inside provider');
  return ctx;
};
