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
  /**
   * Optional stable id attr you can add in markup, e.g.:
   * <section data-nav-id="specs" data-nav-label="Specs" />
   */
  navIdAttr?: string;
  rootMargin?: string;
  threshold?: number | number[];
  scrollOffsetPx?: number;
  autoHideMs?: number; // default 2000
};

export function useSectionNav({
  selector,
  labelAttr = 'data-nav-label',
  idPrefix = 'section-',
  navIdAttr = 'data-nav-id',
  rootMargin = '-40% 0px -50% 0px',
  threshold = 0,
  scrollOffsetPx = 0,
  autoHideMs = 2000,
}: Options) {
  const [sections, setSections] = useState<SectionItem[]>([]);

  // refs to avoid stale closures
  const sectionsRef = useRef<SectionItem[]>([]);
  const visibleIdsRef = useRef<Set<string>>(new Set());

  // nav visibility
  const [isNavVisible, setIsNavVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsNavVisible(false);
    }, autoHideMs);
  }, [autoHideMs]);

  const isVisibleEl = useCallback((el: HTMLElement) => {
    // ignore elements hidden via CSS (e.g. Tailwind hidden / responsive variants)
    if (el.offsetParent === null) return false;
    if (el.getClientRects().length === 0) return false;

    // optional accessibility hidden
    if (el.getAttribute('aria-hidden') === 'true') return false;

    return true;
  }, []);

  const sanitize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

  // Helper: stable dom scan + dedupe
  const scanDom = useCallback(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));

    // take only those with label + visible
    const filtered = els
      .filter((el) => el.hasAttribute(labelAttr))
      .filter(isVisibleEl);

    // dedupe by element reference (safety)
    const uniqEls: HTMLElement[] = [];
    const seenEls = new Set<HTMLElement>();
    for (const el of filtered) {
      if (seenEls.has(el)) continue;
      seenEls.add(el);
      uniqEls.push(el);
    }

    const mapped: SectionItem[] = uniqEls.map((el, idx) => {
      const label =
        el.getAttribute(labelAttr) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('data-title') ||
        `Section ${idx + 1}`;

      // Prefer stable key from markup if present
      const stableNavId = el.getAttribute(navIdAttr) || '';

      // Prefer explicit DOM id if it exists; otherwise set one from stableNavId/label
      let id = el.id;

      if (!id) {
        const base = stableNavId
          ? sanitize(stableNavId)
          : sanitize(label) || 'section';

        id = `${idPrefix}${base}`;

        // Ensure uniqueness if somehow duplicated in DOM
        // (rare, but protects if two visible nodes share same base)
        if (document.getElementById(id) && document.getElementById(id) !== el) {
          id = `${idPrefix}${base}-${idx + 1}`;
        }

        el.id = id;
      }

      return { id, label, el, isActive: false };
    });

    // dedupe by stable key priority: navIdAttr -> id -> label
    const map = new Map<string, SectionItem>();
    for (const s of mapped) {
      const el = s.el;
      const k = el.getAttribute(navIdAttr) || s.id || s.label;

      if (!k) continue;

      if (!map.has(k)) {
        map.set(k, s);
        continue;
      }

      // If duplicate key exists, prefer the one closer to top (more "primary")
      const existing = map.get(k)!;
      const existingTop = existing.el.getBoundingClientRect().top;
      const incomingTop = s.el.getBoundingClientRect().top;
      if (incomingTop < existingTop) {
        map.set(k, s);
      }
    }

    const next = Array.from(map.values());

    sectionsRef.current = next;
    setSections(next);

    // reset visible set on rewiring
    visibleIdsRef.current = new Set();
  }, [selector, labelAttr, navIdAttr, idPrefix, isVisibleEl]);

  // init + rescan on resize/orientation (throttled)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    scanDom();

    // layout settle rescan (fonts/layout shifts)
    const settleTimer = window.setTimeout(() => {
      scanDom();
    }, 250);

    let raf = 0;
    let pending = false;

    const onResize = () => {
      if (pending) return;
      pending = true;
      raf = window.requestAnimationFrame(() => {
        pending = false;
        scanDom();
      });
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.clearTimeout(settleTimer);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [scanDom]);

  // observer: which is in viewport
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

        const current = sectionsRef.current;
        const visible = visibleIdsRef.current;

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
      { root: null, rootMargin, threshold },
    );

    for (const s of sections) obs.observe(s.el);

    return () => obs.disconnect();
  }, [sections, rootMargin, threshold, scrollOffsetPx]);

  const hasAnyActive = useMemo(
    () => sections.some((s) => s.isActive),
    [sections],
  );

  // show/hide on scroll idle
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
    [scrollOffsetPx, scheduleHide],
  );

  return { sections, hasAnyActive, scrollTo, isNavVisible };
}

function pickTopMostVisible(
  items: { id: string; el: HTMLElement; isActive: boolean }[],
  scrollOffsetPx: number,
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
