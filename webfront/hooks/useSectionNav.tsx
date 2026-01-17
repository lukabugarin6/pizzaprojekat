'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SectionNavItem = {
  id: string;
  label: string;
  el: HTMLElement;
  isActive: boolean;
};

type UseSectionNavArgs = {
  selector: string; // npr ".productGridSection"
  scrollOffsetPx?: number; // sticky header offset
  rootMargin?: string; // IntersectionObserver rootMargin
  autoHideMs?: number; // ms posle poslednje aktivnosti
};

type UseSectionNavResult = {
  sections: Array<{ id: string; label: string; isActive: boolean }>;
  hasAnyActive: boolean;
  isNavVisible: boolean;
  scrollTo: (id: string) => void;
};

function stableIdFromElement(el: HTMLElement, index: number) {
  // 1) ako postoji id, koristi ga
  const existing = el.getAttribute('id');
  if (existing) return existing;

  // 2) probaj data-nav-id (ako ti ikad zatreba)
  const dataId = el.getAttribute('data-nav-id');
  if (dataId) return dataId;

  // 3) fallback: deterministicki id po label + index
  const label = (el.getAttribute('data-nav-label') || 'section')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return `section-${label || 'x'}-${index}`;
}

export function useSectionNav({
  selector,
  scrollOffsetPx = 0,
  rootMargin = '-40% 0px -50% 0px',
  autoHideMs = 2000,
}: UseSectionNavArgs): UseSectionNavResult {
  const [items, setItems] = useState<SectionNavItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);

  const ioRef = useRef<IntersectionObserver | null>(null);
  const moRef = useRef<MutationObserver | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showAndScheduleHide = useCallback(() => {
    setIsNavVisible(true);
    clearHideTimer();

    if (autoHideMs > 0) {
      hideTimerRef.current = window.setTimeout(() => {
        setIsNavVisible(false);
      }, autoHideMs);
    }
  }, [autoHideMs, clearHideTimer]);

  const buildItemsFromDom = useCallback((): SectionNavItem[] => {
    const els = Array.from(
      document.querySelectorAll(selector)
    ) as HTMLElement[];

    const next: SectionNavItem[] = els
      .map((el, index) => {
        const label =
          (
            el.getAttribute('data-nav-label') ||
            el.getAttribute('aria-label') ||
            el.textContent ||
            ''
          ).trim() || `Section ${index + 1}`;

        const id = stableIdFromElement(el, index);

        // Ako element nema id, setuj ga JEDNOM deterministicki
        if (!el.getAttribute('id')) {
          el.setAttribute('id', id);
        }

        return {
          id,
          label,
          el,
          isActive: false,
        };
      })
      .filter((s) => !!s.el && !!s.id);

    // Dedupe po id (u slucaju da DOM vrati “duplo” ili hook re-scan)
    const map = new Map<string, SectionNavItem>();
    for (const s of next) map.set(s.id, s);

    return Array.from(map.values());
  }, [selector]);

  const setupIntersectionObserver = useCallback(
    (nextItems: SectionNavItem[]) => {
      // cleanup prethodni IO
      if (ioRef.current) {
        ioRef.current.disconnect();
        ioRef.current = null;
      }

      if (!nextItems.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          // biramo “najboljeg” kandidata: najveci intersectionRatio, pa fallback na nearest top
          let best: { id: string; ratio: number; top: number } | null = null;

          for (const e of entries) {
            if (!e.target || !(e.target instanceof HTMLElement)) continue;
            const id = e.target.id;
            if (!id) continue;

            const ratio = e.isIntersecting ? e.intersectionRatio : 0;
            const top = e.boundingClientRect.top;

            if (!best) {
              best = { id, ratio, top };
              continue;
            }

            if (ratio > best.ratio) best = { id, ratio, top };
            else if (ratio === best.ratio && Math.abs(top) < Math.abs(best.top))
              best = { id, ratio, top };
          }

          if (best && best.id) {
            // spreci “thrash” setovanja istog id-a
            if (lastActiveIdRef.current !== best.id) {
              lastActiveIdRef.current = best.id;
              setActiveId(best.id);
              showAndScheduleHide();
            }
          }
        },
        {
          root: null,
          rootMargin,
          threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1],
        }
      );

      for (const s of nextItems) observer.observe(s.el);

      ioRef.current = observer;
    },
    [rootMargin, showAndScheduleHide]
  );

  const rescanAndRewire = useCallback(() => {
    const nextItems = buildItemsFromDom();

    // ✅ replace (ne append) + očuvaj active flag iz activeId
    setItems(() => {
      const currentActive = lastActiveIdRef.current || activeId;
      return nextItems.map((s) => ({
        ...s,
        isActive: currentActive === s.id,
      }));
    });

    setupIntersectionObserver(nextItems);
  }, [activeId, buildItemsFromDom, setupIntersectionObserver]);

  // inicijalni scan + posle hydrate/layout promena
  useEffect(() => {
    rescanAndRewire();

    // posle fonts/images/layout shift na mobile ume da se promeni presek -> rescan jednom
    const raf = window.requestAnimationFrame(() => rescanAndRewire());

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [rescanAndRewire]);

  // mutation observer: ako se sekcije dodaju/uklanjaju (npr. filters, lazy content)
  useEffect(() => {
    if (moRef.current) {
      moRef.current.disconnect();
      moRef.current = null;
    }

    const mo = new MutationObserver(() => {
      // debounce microtask/raf (da ne radi 100x)
      window.requestAnimationFrame(() => rescanAndRewire());
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    moRef.current = mo;

    return () => {
      mo.disconnect();
      moRef.current = null;
    };
  }, [rescanAndRewire]);

  // show on user activity (scroll/resize) + auto hide
  useEffect(() => {
    const onScroll = () => showAndScheduleHide();
    const onResize = () => showAndScheduleHide();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [showAndScheduleHide]);

  // cleanup timers/observers on unmount
  useEffect(() => {
    return () => {
      clearHideTimer();
      if (ioRef.current) ioRef.current.disconnect();
      if (moRef.current) moRef.current.disconnect();
      ioRef.current = null;
      moRef.current = null;
    };
  }, [clearHideTimer]);

  // sync isActive flags whenever activeId changes
  useEffect(() => {
    if (!activeId) return;
    lastActiveIdRef.current = activeId;

    setItems((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? { ...s, isActive: true }
          : s.isActive
          ? { ...s, isActive: false }
          : s
      )
    );
  }, [activeId]);

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;

      showAndScheduleHide();

      const top =
        el.getBoundingClientRect().top + window.scrollY - scrollOffsetPx;
      window.scrollTo({ top, behavior: 'smooth' });

      // optimistic update (da odmah bolduje)
      if (lastActiveIdRef.current !== id) {
        lastActiveIdRef.current = id;
        setActiveId(id);
      }
    },
    [scrollOffsetPx, showAndScheduleHide]
  );

  const sections = useMemo(
    () => items.map(({ id, label, isActive }) => ({ id, label, isActive })),
    [items]
  );

  const hasAnyActive = !!activeId && sections.some((s) => s.isActive);

  return { sections, hasAnyActive, scrollTo, isNavVisible };
}
