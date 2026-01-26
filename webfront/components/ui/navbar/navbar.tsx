'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import styles from './navbar.module.scss';
import { useCart } from '@/context/cart/cart-context';
import CartSvg from '@/components/svg/cart-svg';
import ClientLink from '../client-link';
import BurgerToggle from '../burger-toggle';
import { useStickyAfterVh } from '@/hooks/useStickyAfterVh';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';

import PizzaSvg from '@/components/svg/pizza-svg';
import DeliveryZoneSvg from '@/components/svg/delivery-zone';
import RandomDeliverySvg from '@/components/svg/random-delivery';
import PhoneSvg from '@/components/svg/phone-svg';
import TimeSvg from '@/components/svg/time-svg';
import LanguageSwitcher from '../language-switcher';
import { PublicRestaurantHoursResponse } from '@/lib/restaurant';

type NavbarDict = {
  brand: string;
  orderPizza: string;
  deliveryPricing: string;
  randomOrder: string;
  workingHours: string; // npr "15:00—23:00"
  phone: string; // npr "+381 (65) 804 04 43"
};

type Props = {
  t: NavbarDict;
  lang: string;
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
  const byDay = new Map<number, any>();
  for (const r of weekly ?? []) byDay.set(Number(r.weekday), r);

  const days: number[] = [1, 2, 3, 4, 5, 6, 7];
  const rows = days.map((d) => ({
    weekday: d,
    row:
      byDay.get(d) ??
      ({
        weekday: d,
        isClosed: true,
        openTime: null,
        closeTime: null,
      } as any),
  }));

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

export default function Navbar({ t, lang, hours }: Props) {
  const pathname = usePathname() || '/';

  // ✅ hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { totalItems: totalItemsRaw } = useCart();
  const totalItems = mounted ? totalItemsRaw : 0; // ✅ SSR-safe
  const cartEmpty = totalItems === 0;

  // sticky posle 0.99vh (za home)
  const stickyAfterVh = useStickyAfterVh(1);

  // locale-aware: /, /en, /en/, /ru, /ru/ su home
  const { pathLang, currentWithoutLang } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return {
      pathLang: segments[0] || '',
      currentWithoutLang: segments.slice(1).join('/'),
    };
  }, [pathname]);

  const isHomePage = currentWithoutLang === '';
  const isCartPage = currentWithoutLang === 'korpa';

  // ✅ ako nisi na home-u -> uvek fixed
  const isFixed = !isHomePage ? true : stickyAfterVh;

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ✅ WORKING HOURS (API-driven, same as Sidebar)
  const isOpenNow = hours ? !!hours.isOpenNow : true; // fallback true da ne sivi sve ako nema data
  const isClosedNow = hours
    ? !!hours.effective?.isClosed || !hours.isOpenNow
    : false;

  const langKey = normLang(pathLang || lang || 'sr-Latn');

  const { hoursLabel, daysLabel } = useMemo(() => {
    if (!hours?.weekly?.length) {
      return {
        hoursLabel: t.workingHours,
        daysLabel: '',
      };
    }

    const best = findBestContinuousRange(hours.weekly);
    const days = best ? formatDayRange(best.start, best.end, langKey) : '';

    const effective = hours.effective;
    const time = effective?.isClosed
      ? ''
      : fmtTimeRange(effective?.openTime, effective?.closeTime);

    if (effective?.isClosed) {
      return {
        hoursLabel:
          langKey === 'en-Us'
            ? 'Closed'
            : langKey === 'ru'
              ? 'Закрыто'
              : 'Zatvoreno',
        daysLabel: days,
      };
    }

    if (time) return { hoursLabel: time, daysLabel: days };

    if (best && best.key !== 'CLOSED') {
      const [openTime, closeTime] = best.key.split('-');
      return { hoursLabel: fmtTimeRange(openTime, closeTime), daysLabel: days };
    }

    return { hoursLabel: t.workingHours, daysLabel: '' };
  }, [hours, t.workingHours, langKey]);

  // ✅ close menu on route change
  useEffect(() => {
    if (!isMenuOpen) return;
    setIsMenuOpen(false);
  }, [pathname]);

  const scrollToNextSection = useSmoothScrollToVh(750, 1);

  useEffect(() => {
    if (!mounted) return;

    if (totalItems > prevTotalRef.current) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems, mounted]);

  const handleCartClick = (e: React.MouseEvent) => {
    if (!mounted) return;
    if (cartEmpty) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHomePage) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = useCallback(() => setIsMenuOpen((v) => !v), []);

  // ✅ lock scroll + esc to close
  useEffect(() => {
    if (!isMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  return (
    <>
      <header
        className={clsx(
          styles.navbar,
          isFixed && styles['navbar--fixed'],
          isMenuOpen && styles['navbar--menuOpen'],
          !isOpenNow && styles['navbar--closed'], // (ako nemaš u scss, slobodno ukloni)
        )}
      >
        <div className={clsx(styles.navbar__langSwitcherAndCartWrapper)}>
          <ClientLink
            href="/korpa"
            preserveLang
            classes={{
              item: styles.navbar__item,
              logo: clsx(
                styles.navbar__item,
                isCartPage && styles['is-active'],
                mounted && cartEmpty && styles['is-disabled'],
              ),
              nonHoverable: styles.navbar__cartWrapper,
            }}
            aria-disabled={mounted && cartEmpty ? 'true' : undefined}
            onClick={handleCartClick}
            data-cart-icon
          >
            <div className={styles.navbar__cartIcon}>
              <CartSvg />
              {mounted && totalItems > 0 && (
                <span className={styles.navbar__badge}>
                  <span
                    className={clsx(
                      styles.navbar__badgeInner,
                      pulse && styles.navbar__badgePulse,
                    )}
                  >
                    {totalItems}
                  </span>
                </span>
              )}
            </div>
          </ClientLink>

          <div className={clsx(styles.langSwitcher)}>
            <LanguageSwitcher />
          </div>
        </div>

        <ClientLink
          href="/"
          preserveLang
          classes={{
            logo: clsx(
              styles.navbar__logo,
              isHomePage && styles['is-disabled'],
            ),
          }}
          aria-disabled={isHomePage ? 'true' : undefined}
          onClick={handleHomeClick}
        >
          {t.brand}
        </ClientLink>

        <BurgerToggle isOpen={isMenuOpen} onToggle={toggleMenu} />
      </header>

      <div
        className={clsx(
          styles.menuOverlay,
          isMenuOpen && styles['menuOverlay--open'],
        )}
        onClick={closeMenu}
      />

      <aside
        className={clsx(
          styles.menuPanel,
          isMenuOpen && styles['menuPanel--open'],
        )}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={styles.menuPanel__inner}
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP CONTENT */}
          <div className={styles.menuTopContent}>
            <button
              className={styles.menuTile}
              onClick={() => {
                closeMenu();

                if (!isHomePage) {
                  const target = lang ? `/${lang}/` : '/';
                  window.dispatchEvent(
                    new CustomEvent('start-route-change', {
                      detail: { href: target },
                    }),
                  );
                  return;
                }

                scrollToNextSection();
              }}
            >
              <span className={styles.menuIcon}>
                <PizzaSvg />
              </span>
              <span className={styles.menuText}>{t.orderPizza}</span>
            </button>

            <ClientLink
              href="/cenovnik-dostave"
              preserveLang
              className={styles.menuTileLink}
              onClick={closeMenu}
            >
              <span className={styles.menuIcon}>
                <DeliveryZoneSvg />
              </span>
              <span className={styles.menuText}>{t.deliveryPricing}</span>
            </ClientLink>

            <ClientLink
              href="/nasumicna-porudzbina"
              preserveLang
              className={styles.menuTileLink}
              onClick={closeMenu}
            >
              <span className={styles.menuIcon}>
                <RandomDeliverySvg />
              </span>
              <span className={styles.menuText}>{t.randomOrder}</span>
            </ClientLink>

            <div className={styles.menuDividerSmall} />

            <a
              className={styles.menuTileLink}
              href="tel:+381658040443"
              onClick={closeMenu}
            >
              <span className={styles.menuIcon}>
                <PhoneSvg />
              </span>
              <span className={styles.menuText}>{t.phone}</span>
            </a>
          </div>

          {/* BOTTOM CONTENT */}
          <div className={styles.menuBottomContent}>
            <div className={styles.menuDividerWide} />

            <div
              className={clsx(
                styles.workingTimeRow,
                isClosedNow && styles.workingTimeRowClosed,
              )}
            >
              <span className={styles.workingTimeIcon}>
                <TimeSvg />
              </span>

              <div className={styles.workingTimeTextTextWrapper}>
                <span className={styles.workingTimeText}>{hoursLabel}</span>
                {daysLabel ? (
                  <div
                    className={styles.workingTimeSubtitle}
                    style={{
                      margin: 0,
                      fontSize: 13,
                    }}
                  >
                    {daysLabel}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
