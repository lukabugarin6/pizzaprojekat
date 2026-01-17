'use client';

import clsx from 'clsx';
import styles from './navbar.module.scss';
import { useCart } from '@/context/cart/cart-context';
import { useEffect, useRef, useState, useCallback } from 'react';
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

export default function Navbar({}: {}) {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isFixed = useStickyAfterVh(1);

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const isCartPage = /(^|\/)korpa\/?$/.test(pathname || '');
  const isHomePage = /^(\/)?$/.test(pathname || '');

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToNextSection = useSmoothScrollToVh(750, 1);

  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setPulse(true);
      const timeout = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  const cartEmpty = totalItems === 0;

  const handleCartClick = (e: React.MouseEvent) => {
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
          isMenuOpen && styles['navbar--menuOpen']
        )}
      >
        <div className={clsx(styles.navbar__langSwitcherAndCartWrapper)}>
          <ClientLink
            href="/korpa"
            classes={{
              item: styles.navbar__item,
              logo: clsx(
                styles.navbar__item,
                isCartPage && styles['is-active'],
                cartEmpty && styles['is-disabled']
              ),
              nonHoverable: styles.navbar__cartWrapper,
            }}
            aria-disabled={cartEmpty ? 'true' : undefined}
            onClick={handleCartClick}
            data-cart-icon
          >
            <div className={styles.navbar__cartIcon}>
              <CartSvg />
              {totalItems > 0 && (
                <span
                  className={clsx(
                    styles.navbar__badge,
                    pulse && styles.navbar__badgePulse
                  )}
                >
                  {totalItems}
                </span>
              )}
            </div>
          </ClientLink>

          <div className={clsx(styles.langSwitcher)}>EN | RU</div>
        </div>

        <ClientLink
          href="/"
          classes={{
            logo: clsx(
              styles.navbar__logo,
              isHomePage && styles['is-disabled']
            ),
          }}
          aria-disabled={isHomePage ? 'true' : undefined}
          onClick={handleHomeClick}
        >
          PIZZA PROJECT
        </ClientLink>

        <BurgerToggle isOpen={isMenuOpen} onToggle={toggleMenu} />
      </header>

      <div
        className={clsx(
          styles.menuOverlay,
          isMenuOpen && styles['menuOverlay--open']
        )}
        onClick={closeMenu}
      />

      <aside
        className={clsx(
          styles.menuPanel,
          isMenuOpen && styles['menuPanel--open']
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
                scrollToNextSection();
              }}
            >
              <span className={styles.menuIcon}>
                <PizzaSvg />
              </span>
              <span className={styles.menuText}>Poruči picu</span>
            </button>

            <div className={styles.menuTileStatic}>
              <span className={styles.menuIcon}>
                <DeliveryZoneSvg />
              </span>
              <span className={styles.menuText}>Zona dostave</span>
            </div>

            <ClientLink
              href="/nasumicna-porudzbina"
              preserveLang
              className={styles.menuTileLink}
              onClick={closeMenu}
            >
              <span className={styles.menuIcon}>
                <RandomDeliverySvg />
              </span>
              <span className={styles.menuText}>Nasumična porudžbina</span>
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
              <span className={styles.menuText}>+381 (65) 804 04 43</span>
            </a>
          </div>

          {/* BOTTOM CONTENT */}
          <div className={styles.menuBottomContent}>
            <div className={styles.menuDividerWide} />

            {/* ✅ working time row, smaller icon + text */}
            <div className={styles.workingTimeRow}>
              <span className={styles.workingTimeIcon}>
                <TimeSvg />
              </span>
              <span className={styles.workingTimeText}>15:00—22:00</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
