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
};

export default function Sidebar({ t, cartT, cartPageT }: Props) {
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
  const [isOpenNow, setIsOpenNow] = useState(true);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const day = now.getDay(); // 0=Sunday ... 6=Saturday
      const isSunday = day === 0;

      const minutes = now.getHours() * 60 + now.getMinutes();
      const start = 15 * 60;
      const end = 23 * 60;

      const openToday = !isSunday && minutes >= start && minutes < end;
      setIsOpenNow(openToday);
    };

    compute();
    const timer = window.setInterval(compute, 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
              !isOpenNow && styles.workingHoursClosed,
            )}
          >
            <TimeSvg />
            <span>{t.workingHours}</span>
          </div>
        </div>

        <div className={clsx(styles.langSwitcher)}>
          <LanguageSwitcher shorter />
        </div>
      </div>
    </div>
  );
}
