'use client';

import clsx from 'clsx';
import styles from './navbar.module.scss';
import { useCart } from '@/context/cart/cart-context';
import { useEffect, useRef, useState } from 'react';
import CartSvg from '@/components/svg/cart-svg';
import ClientLink from '../client-link';
import { usePathname } from 'next/navigation';
import BurgerToggle from '../burger-toggle';
import { useStickyAfterVh } from '@/hooks/useStickyAfterVh';

export default function Navbar({}: {}) {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isFixed = useStickyAfterVh(1); // ✅ posle 100vh

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const isCartPage = /(^|\/)korpa\/?$/.test(pathname || '');
  const isHomePage = /^(\/)?$/.test(pathname || ''); // ✅ "/" or "" just in case

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

  return (
    <header className={clsx(styles.navbar, isFixed && styles['navbar--fixed'])}>
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
          logo: clsx(styles.navbar__logo, isHomePage && styles['is-disabled']),
        }}
        aria-disabled={isHomePage ? 'true' : undefined}
        onClick={handleHomeClick}
      >
        PIZZA PROJECT
      </ClientLink>

      <BurgerToggle />
    </header>
  );
}
