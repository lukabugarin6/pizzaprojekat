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

  // ✅ refovi da izbegnemo stale closures + duple observe
  const sectionsRef = useRef<SectionItem[]>([]);
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

  // ✅ helper: stable/deduped scan
  const scanDom = useCallback(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));

    // (opciono ali preporučeno) — uzmi samo one koje zaista imaju labelAttr
    const filtered = els.filter((el) => el.hasAttribute(labelAttr));

    // dedupe by element reference
    const uniqEls: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();
    for (const el of filtered) {
      if (seen.has(el)) continue;
      seen.add(el);
      uniqEls.push(el);
    }

    const mapped: SectionItem[] = uniqEls.map((el, idx) => {
      const label =
        el.getAttribute(labelAttr) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('data-title') ||
        `Section ${idx + 1}`;

      let id = el.id;
      if (!id) {
        // ✅ stabilniji id: prefix + sanitized label + index
        const safe = label
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-]/g, '');
        id = `${idPrefix}${safe || 'section'}-${idx + 1}`;
        el.id = id;
      }

      return { id, label, el, isActive: false };
    });

    // dedupe by id (za svaki slučaj)
    const map = new Map<string, SectionItem>();
    for (const s of mapped) map.set(s.id, s);

    const next = Array.from(map.values());

    sectionsRef.current = next;
    setSections(next);

    // reset visible set jer rewire
    visibleIdsRef.current = new Set();
  }, [selector, labelAttr, idPrefix]);

  // init + rescan na resize/orientation (mobilni “2x” često dođe od ovoga)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    scanDom();

    const onResize = () => scanDom();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [scanDom]);

  // observer: koji je u viewportu
  useEffect(() => {
    if (!sections.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.id;
          if (!id) continue;

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

        if (!changed) return;

        // ✅ uvek računaj iz latest sectionsRef (ne iz stale prev)
        const current = sectionsRef.current;
        const visible = visibleIdsRef.current;

        // mark visible
        const marked = current.map((s) => ({
          ...s,
          isActive: visible.has(s.id),
        }));

        const activeId = pickTopMostVisible(marked, scrollOffsetPx);

        const next = marked.map((s) => ({
          ...s,
          isActive: s.id === activeId,
        }));

        sectionsRef.current = next;
        setSections(next);
      },
      { root: null, rootMargin, threshold }
    );

    // ✅ observe samo ono što trenutno postoji, bez dupliranja
    for (const s of sections) obs.observe(s.el);

    return () => obs.disconnect();
  }, [sections, rootMargin, threshold, scrollOffsetPx]);

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
    scheduleHide();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  const scrollTo = useCallback(
    (id: string) => {
      const s = sectionsRef.current.find((x) => x.id === id);
      if (!s) return;

      setIsNavVisible(true);
      scheduleHide();

      const y =
        s.el.getBoundingClientRect().top + window.scrollY - scrollOffsetPx;
      window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [scrollOffsetPx, scheduleHide]
  );

  return { sections, hasAnyActive, scrollTo, isNavVisible };
}

function pickTopMostVisible(
  items: { id: string; el: HTMLElement; isActive: boolean }[],
  scrollOffsetPx: number
) {
  const visible = items.filter((x) => x.isActive);
  if (!visible.length) return '';

  visible.sort((a, b) => {
    const at = Math.abs(a.el.getBoundingClientRect().top - scrollOffsetPx);
    const bt = Math.abs(b.el.getBoundingClientRect().top - scrollOffsetPx);
    return at - bt;
  });

  return visible[0].id;
}
