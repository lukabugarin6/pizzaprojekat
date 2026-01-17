'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

type SectionItem = {
  id: string;
  label: string;
  el: HTMLElement;
  isActive: boolean;
};

type Options = {
  selector: string;
  labelAttr?: string;
  idPrefix?: string;
  rootMargin?: string;
  threshold?: number | number[];
  scrollOffsetPx?: number;
  autoHideMs?: number; // default 2000
};

export function useSectionNav({
  selector,
  labelAttr = 'data-nav-label',
  idPrefix = 'section-',
  rootMargin = '-40% 0px -50% 0px',
  threshold = 0,
  scrollOffsetPx = 0,
  autoHideMs = 2000,
}: Options) {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const visibleIdsRef = useRef<Set<string>>(new Set());

  // ✅ nav visibility
  const [isNavVisible, setIsNavVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsNavVisible(false);
    }, autoHideMs);
  }, [autoHideMs]);

  // ✅ init: pokupi elemente (dedupe + reset)
  useEffect(() => {
    let raf = 0;

    const scan = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(selector));

      // reset visible set on each scan
      visibleIdsRef.current = new Set();

      const seenIds = new Set<string>();
      const seenEls = new Set<HTMLElement>();

      const mapped: SectionItem[] = [];

      els.forEach((el, idx) => {
        // dedupe by element reference (paranoia)
        if (seenEls.has(el)) return;
        seenEls.add(el);

        const label =
          el.getAttribute(labelAttr) ||
          el.getAttribute('aria-label') ||
          el.getAttribute('data-title') ||
          `Section ${idx + 1}`;

        let id = el.id;

        // assign stable id if missing
        if (!id) {
          id = `${idPrefix}${idx + 1}`;
          el.id = id;
        }

        // dedupe by id
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);

        mapped.push({ id, label, el, isActive: false });
      });

      setSections(mapped);
    };

    // defer one tick to avoid hydration/DOM timing issues
    raf = window.requestAnimationFrame(scan);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [selector, labelAttr, idPrefix]);

  // ✅ observer: koji je u viewportu
  useEffect(() => {
    if (!sections.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.id;

          if (entry.isIntersecting) {
            if (!visibleIdsRef.current.has(id)) {
              visibleIdsRef.current.add(id);
              changed = true;
            }
          } else {
            if (visibleIdsRef.current.delete(id)) {
              changed = true;
            }
          }
        }

        if (changed) {
          setSections((prev) => {
            const visible = visibleIdsRef.current;

            const next = prev.map((s) => ({
              ...s,
              isActive: visible.has(s.id),
            }));

            const activeId = pickTopMostVisible(next);

            return next.map((s) => ({
              ...s,
              isActive: s.id === activeId,
            }));
          });
        }
      },
      { root: null, rootMargin, threshold }
    );

    sections.forEach((s) => obs.observe(s.el));

    return () => {
      obs.disconnect();
    };
  }, [sections, rootMargin, threshold]);

  const hasAnyActive = useMemo(
    () => sections.some((s) => s.isActive),
    [sections]
  );

  // ✅ show/hide on scroll idle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      setIsNavVisible(true);
      scheduleHide();
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // init hide
    scheduleHide();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  const scrollTo = useCallback(
    (id: string) => {
      const s = sections.find((x) => x.id === id);
      if (!s) return;

      setIsNavVisible(true);
      scheduleHide();

      const y =
        s.el.getBoundingClientRect().top + window.scrollY - scrollOffsetPx;

      window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [sections, scrollOffsetPx, scheduleHide]
  );

  return { sections, hasAnyActive, scrollTo, isNavVisible };
}

function pickTopMostVisible(
  items: { id: string; el: HTMLElement; isActive: boolean }[]
) {
  const visible = items.filter((x) => x.isActive);
  if (!visible.length) return '';

  visible.sort(
    (a, b) =>
      a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top
  );

  return visible[0].id;
}
