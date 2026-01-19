'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { useSectionNav } from '@/hooks/useSectionNav';

type Props = {
  selector: string;
  className?: string;
  scrollOffsetPx?: number;
};

export default function ProductsFloatingNav({
  selector,
  className,
  scrollOffsetPx = 0,
}: Props) {
  const { sections, hasAnyActive, scrollTo, isNavVisible } = useSectionNav({
    selector,
    scrollOffsetPx,
    rootMargin: '-40% 0px -50% 0px',
    autoHideMs: 2000,
  });

  const uniqueSections = useMemo(() => {
    const map = new Map<string, (typeof sections)[number]>();

    for (const s of sections) {
      // Prefer a stable unique key. If id exists, use it; otherwise fall back to label.
      const key = (s as any)?.id ?? (s as any)?.label;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, s);
        continue;
      }

      // If a duplicate exists, prefer the active one (nice UX when duplicates appear transiently)
      const existing = map.get(key)!;
      const existingActive = (existing as any)?.isActive ?? false;
      const incomingActive = (s as any)?.isActive ?? false;

      if (!existingActive && incomingActive) {
        map.set(key, s);
      }
    }

    return Array.from(map.values());
  }, [sections]);

  if (!hasAnyActive) return null;
  if (uniqueSections.length === 0) return null;

  return (
    <div
      className={clsx(
        'flex',
        'fixed bottom-6 right-1.5 xl:right-2 z-50 flex-col items-center gap-14',
        'transition-opacity duration-300 z-[9999]',
        isNavVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}
    >
      {uniqueSections.map((s) => (
        <button
          key={(s as any).id ?? (s as any).label}
          onClick={() => scrollTo((s as any).id)}
          title={(s as any).label}
          className={clsx(
            'bg-transparent p-0 m-0 border-0 outline-none select-none appearance-none',
            'cursor-pointer',
            'capitalize tracking-[0.1em] text-[15px] leading-none',
            'text-neutral-600 hover:text-neutral-800 transition-colors',
            '[writing-mode:vertical-rl] rotate-180',
            (s as any).isActive ? 'font-bold text-neutral-900' : 'font-medium',
          )}
          style={{ fontFamily: 'var(--font-roboto-condensed)' }}
        >
          {(s as any).label}
        </button>
      ))}
    </div>
  );
}
