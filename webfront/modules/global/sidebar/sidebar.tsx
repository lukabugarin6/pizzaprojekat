'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type Props = {
  lang?: 'sr-Latn' | 'sr-Cyrl';
};

export default function Sidebar({ lang }: Props) {
  const pathname = usePathname();

  // /korpa, /sr-Latn/korpa, /sr-Cyrl/korpa, /en/korpa, /ru/korpa
  const isCartPage = /(^|\/)korpa\/?$/.test(pathname || '');
  const isRandomPage = /(^|\/)nasumicna-porudzbina\/?$/.test(pathname || '');
  const isDeliveryPage = /(^|\/)cenovnik-dostave\/?$/.test(pathname || '');

  const scrollToNextSection = useSmoothScrollToVh(750, 1);
  const { totalItems } = useCart();
  const cartEmpty = totalItems === 0;

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const {
    isOpen: isCartPreviewOpen,
    handleMouseEnter: handleCartMouseEnter,
    handleMouseLeave: handleCartMouseLeave,
  } = useDelayedHover(700);

  // ✅ WORKING HOURS: 15:00–23:00 (local time)
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

    const t = window.setInterval(compute, 30_000);
    return () => window.clearInterval(t);
  }, []);

  // if we navigate to cart page, force-close preview
  useEffect(() => {
    if (isCartPage) {
      handleCartMouseLeave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartPage]);

  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setPulse(true);

      const timeout = setTimeout(() => {
        setPulse(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }

    prevTotalRef.current = totalItems;
  }, [totalItems]);

  const handleCartEnterSafe = () => {
    if (isCartPage) return;
    handleCartMouseEnter();
  };

  const handleCartLeaveSafe = () => {
    if (isCartPage) return;
    handleCartMouseLeave();
  };

  const handleCartClick = (e: React.MouseEvent) => {
    // ✅ samo blokiraj odlazak na /korpa kad je prazno
    if (cartEmpty) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const isHomePage = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    // "/" ili "/en" ili "/sr-Latn" itd.
    return segments.length <= 1;
  }, [pathname]);

  return (
    <div className={clsx(styles.wrapper, !isOpenNow && styles.closed)}>
      <div className={clsx(styles.wrapper__inner)}>
        <ClientLink
          href="/"
          classes={{
            item: styles.wrapper__inner__item,
            logo: styles.wrapper__inner__logo,
            nonHoverable: styles.nonHoverable,
          }}
        >
          PIZZA <br />
          PROJECT
        </ClientLink>

        <div className={clsx(styles.wrapper__inner__top)}>
          <ClientLink
            href="/"
            preserveLang
            classes={{
              item: styles.wrapper__inner__item,
              logo: styles.wrapper__inner__top__item,
            }}
            onClick={(e) => {
              if (!isHomePage) return;
              scrollToNextSection();
            }}
          >
            <PizzaSvg />
            <span>Poruči picu</span>
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
          >
            <DeliveryZoneSvg />
            <span>Cenovnik dostave</span>
          </ClientLink>

          {/* CART LINK (preview radi i kad je prazno; samo klik blokiran) */}
          <ClientLink
            href="/korpa"
            classes={{
              item: styles.wrapper__inner__item,
              logo: clsx(
                styles.wrapper__inner__top__item,
                isCartPage && styles.active,
                cartEmpty && styles.disabled,
              ),
              nonHoverable: styles.cartWrapper,
            }}
            aria-disabled={cartEmpty ? 'true' : undefined}
            onClick={handleCartClick}
            data-cart-icon
            onMouseEnter={handleCartEnterSafe}
            onMouseLeave={handleCartLeaveSafe}
          >
            <div className={styles.cartIcon}>
              <CartSvg />
              {totalItems > 0 && (
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
            <span>Korpa</span>
          </ClientLink>

          {/* CART PREVIEW PANEL (disabled only when on /korpa page) */}
          <SidebarCartPreview
            isOpen={!isCartPage && isCartPreviewOpen}
            onMouseEnter={handleCartEnterSafe}
            onMouseLeave={handleCartLeaveSafe}
          />

          <ClientLink
            href="/nasumicna-porudzbina"
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
            <span>Nasumična porudžbina</span>
          </ClientLink>

          <div className={clsx(styles.wrapper__inner__item, styles.phone)}>
            <PhoneSvg />
            <span>+381 (65) 804 04 43</span>
            <span className={clsx(styles.wrapper__inner__item__subtitle)}>
              Pozovite nas
            </span>
          </div>

          <div
            className={clsx(
              styles.wrapper__inner__item,
              styles.smaller,
              styles.nonHoverable,
              !isOpenNow && styles.workingHoursClosed,
            )}
          >
            <TimeSvg />
            <span>15:00—23:00</span>
          </div>
        </div>

        <div className={clsx(styles.langSwitcher)}>EN | RU</div>
      </div>
    </div>
  );
}
