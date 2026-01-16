'use client';

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

  if (!hasAnyActive) return null;

  return (
    <div
      className={clsx(
        // ✅ samo 1280+
        'hidden min-[1280px]:flex',
        'fixed bottom-6 right-2 z-50 flex-col items-center gap-14',
        'transition-opacity duration-300',
        isNavVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          title={s.label}
          className={clsx(
            'bg-transparent p-0 m-0 border-0 outline-none select-none appearance-none',
            'cursor-pointer',
            'capitalize tracking-[0.1em] text-[15px] leading-none',
            'text-neutral-600 hover:text-neutral-800 transition-colors',
            '[writing-mode:vertical-rl] rotate-180',
            s.isActive ? 'font-bold text-neutral-900' : 'font-medium'
          )}
          style={{ fontFamily: 'var(--font-roboto-condensed)' }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
