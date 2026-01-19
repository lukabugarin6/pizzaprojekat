'use client';

import clsx from 'clsx';
import styles from './navbar.module.scss';
import { useCart } from '@/context/cart/cart-context';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import CartSvg from '@/components/svg/cart-svg';
import ClientLink from '../client-link';
import { usePathname } from 'next/navigation';
import BurgerToggle from '../burger-toggle';
import { useStickyAfterVh } from '@/hooks/useStickyAfterVh';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';

import PizzaSvg from '@/components/svg/pizza-svg';
import DeliveryZoneSvg from '@/components/svg/delivery-zone';
import RandomDeliverySvg from '@/components/svg/random-delivery';
import PhoneSvg from '@/components/svg/phone-svg';
import TimeSvg from '@/components/svg/time-svg';
import LanguageSwitcher from '../language-switcher';

type NavbarDict = {
  brand: string;
  orderPizza: string;
  deliveryPricing: string;
  randomOrder: string;
  workingHours: string; // npr "15:00—23:00"
  phone: string; // npr "+381 (65) 804 04 43"
};

export default function Navbar({ t, lang }: { t: NavbarDict; lang: string }) {
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
  const { lang: pathLang, currentWithoutLang } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return {
      lang: segments[0] || '',
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

  // ✅ WORKING HOURS: Mon–Sat 15:00–23:00 (local time), Sunday closed
  const [isOpenNow, setIsOpenNow] = useState(true);

  useEffect(() => {
    const compute = () => {
      const now = new Date();

      const day = now.getDay(); // 0=Sunday ... 6=Saturday
      const isSunday = day === 0;

      const minutes = now.getHours() * 60 + now.getMinutes();
      const start = 15 * 60; // 15:00
      const end = 23 * 60; // 23:00

      const openToday = !isSunday && minutes >= start && minutes < end;
      setIsOpenNow(openToday);
    };

    compute();

    const timer = window.setInterval(compute, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // ✅ close menu on route change
  useEffect(() => {
    if (!isMenuOpen) return;
    setIsMenuOpen(false);
  }, [pathname, isMenuOpen]);

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
    if (!mounted) return; // ✅ avoid SSR mismatch edge-case
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
                mounted && cartEmpty && styles['is-disabled'], // ✅ only after mount
              ),
              nonHoverable: styles.navbar__cartWrapper,
            }}
            // ✅ do NOT render aria-disabled on server
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
                !isOpenNow && styles.workingTimeRowClosed,
              )}
            >
              <span className={styles.workingTimeIcon}>
                <TimeSvg />
              </span>
              <span className={styles.workingTimeText}>{t.workingHours}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
