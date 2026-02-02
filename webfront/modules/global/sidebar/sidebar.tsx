'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import styles from './sidebar.module.scss';
import TimeSvg from '@/components/svg/time-svg';
import PhoneSvg from '@/components/svg/phone-svg';
import DeliveryZoneSvg from '@/components/svg/delivery-zone';
import RandomDeliverySvg from '@/components/svg/random-delivery';
import CartSvg from '@/components/svg/cart-svg';
import PizzaSvg from '@/components/svg/pizza-svg';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';
import { useCart } from '@/context/cart/cart-context';
import ClientLink from '@/components/ui/client-link';
import SidebarCartPreview from '@/components/ui/sidebar-cart-preview';
import { useDelayedHover } from '@/hooks/useDelayedHover';
import LanguageSwitcher from '@/components/ui/language-switcher';
import { Dictionary } from '@/app/[lang]/dictionaries';
import { PublicRestaurantHoursResponse } from '@/lib/restaurant';

type SidebarDict = {
  brandTop: string;
  brandBottom: string;
  orderPizza: string;
  deliveryPricing: string;
  cart: string;
  randomOrder: string;
  callUs: string;
  workingHours: string;
};

type Props = {
  t: SidebarDict;
  cartT: Dictionary['cart'];
  cartPageT: Dictionary['cartPage'];
  hours?: PublicRestaurantHoursResponse | null;
};

type DayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon..Sun

const dayShort: Record<string, Record<DayKey, string>> = {
  'sr-Latn': {
    1: 'Pon',
    2: 'Uto',
    3: 'Sre',
    4: 'Čet',
    5: 'Pet',
    6: 'Sub',
    7: 'Ned',
  },
  'en-Us': {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  },
  ru: { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' },
};

function normLang(l: string) {
  if (l === 'en' || l === 'en-US' || l === 'en-us') return 'en-Us';
  if (l === 'sr' || l === 'sr-Latn' || l === 'sr-latn') return 'sr-Latn';
  if (l === 'ru' || l === 'ru-RU' || l === 'ru-ru') return 'ru';
  return l;
}

function fmtTimeRange(openTime?: string | null, closeTime?: string | null) {
  if (!openTime || !closeTime) return '';
  // em dash ili —, ti već koristiš —
  return `${openTime}—${closeTime}`;
}

function sameHoursKey(row: {
  isClosed: boolean;
  openTime: any;
  closeTime: any;
}) {
  if (row.isClosed) return 'CLOSED';
  return `${row.openTime ?? ''}-${row.closeTime ?? ''}`;
}

/**
 * Nađe najveći "kontinuirani" blok dana koji imaju identično radno vreme (npr pon-sub).
 * Preferira blok koji NIJE zatvoren (otvoreni sati).
 */
function findBestContinuousRange(weekly: any[]) {
  // weekly: [{weekday, isClosed, openTime, closeTime}, ...]
  // Mapiramo 1..7 u niz
  const byDay = new Map<number, any>();
  for (const r of weekly ?? []) byDay.set(Number(r.weekday), r);

  const days: number[] = [1, 2, 3, 4, 5, 6, 7];
  const rows = days.map((d) => ({
    weekday: d,
    row: byDay.get(d) ?? {
      weekday: d,
      isClosed: true,
      openTime: null,
      closeTime: null,
    },
  }));

  // helper za najbolje: najduži, a ako je izjednačeno preferiraj OPEN blok
  let best: {
    start: number;
    end: number;
    key: string;
    len: number;
    openPreferred: boolean;
  } | null = null;

  let i = 0;
  while (i < rows.length) {
    const k = sameHoursKey(rows[i].row);
    let j = i;
    while (j + 1 < rows.length && sameHoursKey(rows[j + 1].row) === k) j++;

    const len = j - i + 1;
    const openPreferred = k !== 'CLOSED';

    const candidate = {
      start: rows[i].weekday,
      end: rows[j].weekday,
      key: k,
      len,
      openPreferred,
    };

    if (!best) best = candidate;
    else {
      if (candidate.len > best.len) best = candidate;
      else if (candidate.len === best.len) {
        // prefer open over closed
        if (candidate.openPreferred && !best.openPreferred) best = candidate;
      }
    }

    i = j + 1;
  }

  return best;
}

function formatDayRange(start: number, end: number, lang: string) {
  const dict = dayShort[normLang(lang)] ?? dayShort['sr-Latn'];
  const s = dict[start as DayKey] ?? String(start);
  const e = dict[end as DayKey] ?? String(end);
  if (start === end) return s;
  return `${s}–${e}`;
}

export default function Sidebar({ t, cartT, cartPageT, hours }: Props) {
  const pathname = usePathname() || '/';

  // ✅ hydration guard (SSR sees empty cart; wait for client mount)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // locale-aware routes
  const isCartPage = /(^|\/)korpa\/?$/.test(pathname);
  const isRandomPage = /(^|\/)nasumicna-porudzbina\/?$/.test(pathname);
  const isDeliveryPage = /(^|\/)cenovnik-dostave\/?$/.test(pathname);

  const scrollToNextSection = useSmoothScrollToVh(750, 1);

  const { totalItems: totalItemsRaw } = useCart();

  // ✅ SSR-safe values
  const totalItems = mounted ? totalItemsRaw : 0;
  const cartEmpty = totalItems === 0;

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const {
    isOpen: isCartPreviewOpen,
    handleMouseEnter: handleCartMouseEnter,
    handleMouseLeave: handleCartMouseLeave,
  } = useDelayedHover(700);

  // ✅ WORKING HOURS
  const isOpenNow = hours ? !!hours.isOpenNow : true; // fallback true da ne sivi sve ako nema data
  const isClosedNow = hours
    ? !!hours.effective?.isClosed || !hours.isOpenNow
    : false;

  // if we navigate to cart page, force-close preview
  useEffect(() => {
    if (isCartPage) handleCartMouseLeave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartPage]);

  useEffect(() => {
    if (!mounted) return;

    if (totalItems > prevTotalRef.current) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timeout);
    }

    prevTotalRef.current = totalItems;
  }, [totalItems, mounted]);

  const handleCartEnterSafe = () => {
    if (!mounted) return; // ✅ no preview during SSR/first paint
    if (isCartPage) return;
    handleCartMouseEnter();
  };

  const handleCartLeaveSafe = () => {
    if (!mounted) return;
    if (isCartPage) return;
    handleCartMouseLeave();
  };

  const handleCartClick = (e: React.MouseEvent) => {
    if (!mounted) return; // ✅ avoid SSR mismatch edge cases
    if (cartEmpty) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // locale-aware home detection
  const { currentWithoutLang, langFromPath } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return {
      langFromPath: segments[0] || '',
      currentWithoutLang: segments.slice(1).join('/'),
    };
  }, [pathname]);

  const isHomePage =
    currentWithoutLang === '' || (pathname === '/' && !langFromPath);

  const handleOrderPizza = useCallback(
    (e: React.MouseEvent) => {
      if (!isHomePage) return;

      e.preventDefault();
      e.stopPropagation();
      scrollToNextSection();
    },
    [isHomePage, scrollToNextSection],
  );

  const langKey = normLang(langFromPath || 'sr-Latn');

  const { hoursLabel, daysLabel } = useMemo(() => {
    if (!hours?.weekly?.length) {
      return { hoursLabel: t.workingHours, daysLabel: '' };
    }

    const best = findBestContinuousRange(hours.weekly);

    // Ako je najbolji blok CLOSED (npr. svi dani closed), fallback na default
    if (!best || best.key === 'CLOSED') {
      return { hoursLabel: t.workingHours, daysLabel: '' };
    }

    const days = formatDayRange(best.start, best.end, langKey);

    const [openTime, closeTime] = best.key.split('-');
    const time = fmtTimeRange(openTime, closeTime);

    return { hoursLabel: time || t.workingHours, daysLabel: days };
  }, [hours, t.workingHours, langKey]);

  return (
    <div className={clsx(styles.wrapper, !isOpenNow && styles.closed)}>
      <div className={clsx(styles.wrapper__inner)}>
        <ClientLink
          href="/"
          preserveLang
          classes={{
            item: styles.wrapper__inner__item,
            logo: styles.wrapper__inner__logo,
            nonHoverable: styles.nonHoverable,
          }}
        >
          {t.brandTop} <br />
          {t.brandBottom}
        </ClientLink>

        <div className={clsx(styles.wrapper__inner__top)}>
          <ClientLink
            href="/"
            preserveLang
            classes={{
              item: styles.wrapper__inner__item,
              logo: styles.wrapper__inner__top__item,
            }}
            onClick={handleOrderPizza}
          >
            <PizzaSvg />
            <span>{t.orderPizza}</span>
          </ClientLink>

          <ClientLink
            classes={{
              item: styles.wrapper__inner__item,
              logo: clsx(
                styles.wrapper__inner__top__item,
                isDeliveryPage && styles.active,
              ),
              nonHoverable: styles.smaller,
            }}
            href="/cenovnik-dostave"
            preserveLang
          >
            <DeliveryZoneSvg />
            <span>{t.deliveryPricing}</span>
          </ClientLink>

          <ClientLink
            href="/korpa"
            preserveLang
            classes={{
              item: styles.wrapper__inner__item,
              logo: clsx(
                styles.wrapper__inner__top__item,
                isCartPage && styles.active,
                mounted && cartEmpty && styles.disabled, // ✅ only after mount
              ),
              nonHoverable: styles.cartWrapper,
            }}
            // ✅ do NOT render aria-disabled on server → prevents mismatch
            aria-disabled={mounted && cartEmpty ? 'true' : undefined}
            onClick={handleCartClick}
            data-cart-icon
            onMouseEnter={handleCartEnterSafe}
            onMouseLeave={handleCartLeaveSafe}
          >
            <div className={styles.cartIcon}>
              <CartSvg />
              {mounted && totalItems > 0 && (
                <span
                  className={clsx(
                    styles.cartBadge,
                    pulse && styles.cartBadgePulse,
                  )}
                >
                  {totalItems}
                </span>
              )}
            </div>
            <span>{t.cart}</span>
          </ClientLink>

          <SidebarCartPreview
            isOpen={mounted && !isCartPage && isCartPreviewOpen}
            onMouseEnter={handleCartEnterSafe}
            onMouseLeave={handleCartLeaveSafe}
            cartT={cartT}
            cartPageT={cartPageT}
            hours={hours}
          />

          <ClientLink
            href="/nasumicna-porudzbina"
            preserveLang
            classes={{
              item: styles.wrapper__inner__item,
              logo: clsx(
                styles.wrapper__inner__top__item,
                styles.smaller,
                isRandomPage && styles.active,
              ),
              nonHoverable: styles.smaller,
            }}
          >
            <RandomDeliverySvg />
            <span>{t.randomOrder}</span>
          </ClientLink>

          <div className={clsx(styles.wrapper__inner__item, styles.phone)}>
            <PhoneSvg />
            <span>+381 (65) 804 04 43</span>
            <span className={clsx(styles.wrapper__inner__item__subtitle)}>
              {t.callUs}
            </span>
          </div>

          <div
            className={clsx(
              styles.wrapper__inner__item,
              styles.smaller,
              styles.nonHoverable,
              isClosedNow && styles.workingHoursClosed,
            )}
          >
            <TimeSvg />
            <span>{hoursLabel}</span>
            {daysLabel ? (
              <span
                className={clsx(styles.wrapper__inner__item__subtitle)}
                style={{
                  textDecoration: 'none',
                  position: 'relative',
                  top: '-6px',
                }}
              >
                {daysLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className={clsx(styles.langSwitcher)}>
          <LanguageSwitcher shorter />
        </div>
      </div>
    </div>
  );
}
