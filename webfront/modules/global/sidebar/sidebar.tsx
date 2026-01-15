'use client';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
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
  const scrollToNextSection = useSmoothScrollToVh(750, 1);
  const { totalItems } = useCart();

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

  const {
    isOpen: isCartPreviewOpen,
    handleMouseEnter: handleCartMouseEnter,
    handleMouseLeave: handleCartMouseLeave,
  } = useDelayedHover(700);

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

  return (
    <div className={clsx(styles.wrapper)}>
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
          <div
            className={clsx(
              styles.wrapper__inner__item,
              styles.wrapper__inner__top__item
            )}
            onClick={scrollToNextSection}
          >
            <PizzaSvg />
            <span>Poruči picu</span>
          </div>

          <div
            className={clsx(
              styles.wrapper__inner__item,
              styles.wrapper__inner__top__item,
              styles.smaller
            )}
          >
            <DeliveryZoneSvg />
            <span>Zona dostave</span>
          </div>

          {/* CART LINK + HOVER LOGIKA */}
          <ClientLink
            href="/korpa"
            classes={{
              item: styles.wrapper__inner__item,
              logo: styles.wrapper__inner__top__item,
              nonHoverable: styles.cartWrapper,
            }}
            data-cart-icon
            onMouseEnter={handleCartMouseEnter}
            onMouseLeave={handleCartMouseLeave}
          >
            <div className={styles.cartIcon}>
              <CartSvg />
              {totalItems > 0 && (
                <span
                  className={clsx(
                    styles.cartBadge,
                    pulse && styles.cartBadgePulse
                  )}
                >
                  {totalItems}
                </span>
              )}
            </div>
            <span>Korpa</span>
          </ClientLink>

          {/* CART PREVIEW PANEL */}
          <SidebarCartPreview
            isOpen={isCartPreviewOpen}
            onMouseEnter={handleCartMouseEnter}
            onMouseLeave={handleCartMouseLeave}
          />

          <ClientLink
            href="/nasumicna-porudzbina"
            classes={{
              item: styles.wrapper__inner__item,
              logo: styles.wrapper__inner__top__item,
              nonHoverable: styles.smaller,
            }}
          >
            <RandomDeliverySvg />
            <span>Nasumična porudžbina</span>
          </ClientLink>
        </div>

        <div className={clsx(styles.wrapper__inner__bottom)}>
          <div className={clsx(styles.wrapper__inner__item)}>
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
              styles.nonHoverable
            )}
          >
            <TimeSvg />
            <span>15:00—22:00</span>
          </div>
          <div
            className={clsx(styles.wrapper__inner__item, styles.langSwitcher)}
          >
            RS | EN | RU
          </div>
        </div>
      </div>
    </div>
  );
}
