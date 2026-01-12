'use client';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './sidebar.module.scss';
import LanguageSwitcher from '@/components/ui/language-switcher';
import Link from 'next/link';
import { useHeaderThemeBySection } from '@/hooks/useHeaderThemeBySection';
import { NavbarDict } from '@/app/[lang]/dictionaries';
import Container from '@/components/ui/container';
import GridItem from '@/components/ui/grid-item';
import Grid from '@/components/ui/grid';
import { usePathname } from 'next/navigation';
import NbsLogo from '@/public/svg/sr-Cyrl/NbsLogo';
import NbsIspis from '@/public/svg/sr-Cyrl/NbsIspis';
import NbsIspisLatn from '@/public/svg/sr-Latn/NbsIspisLatn';
import TimeSvg from '@/components/svg/time-svg';
import PhoneSvg from '@/components/svg/phone-svg';
import DeliveryZoneSvg from '@/components/svg/delivery-zone';
import RandomDeliverySvg from '@/components/svg/random-delivery';
import CartSvg from '@/components/svg/cart-svg';
import LogoSvg from '@/components/svg/logo-svg';
import PizzaSvg from '@/components/svg/pizza-svg';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';
import { useCart } from '@/context/cart/cart-context';

type Props = {
  t: NavbarDict;
  lang: 'sr-Latn' | 'sr-Cyrl';
};

export default function Sidebar({ t, lang }: Props) {
  const scrollToNextSection = useSmoothScrollToVh(750, 1);
  const { totalItems } = useCart();

  const prevTotalRef = useRef(totalItems);
  const [pulse, setPulse] = useState(false);

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
        <a
          href="/"
          className={clsx(
            styles.wrapper__inner__item,
            styles.wrapper__inner__logo,
            styles.nonHoverable
          )}
          onClick={(e) => {
            e.preventDefault();

            // uzmi trenutni path bez prvog segmenta (lang)
            const pathSegments = window.location.pathname
              .split('/')
              .filter(Boolean);
            const currentPath = pathSegments.slice(1).join('/'); // ukloni lang
            const targetPath = ''; // home bez lang

            // ako smo već na home unutar trenutnog lang
            if (currentPath === targetPath) {
              window.dispatchEvent(
                new CustomEvent('start-route-change', {
                  detail: { href: window.location.pathname, forceOpen: true },
                })
              );
            } else {
              // normalan flow: idi na home
              window.dispatchEvent(
                new CustomEvent('start-route-change', {
                  detail: { href: `/${pathSegments[0]}/` }, // zadrži trenutni lang
                })
              );
            }
          }}
        >
          PIZZA <br />
          PROJECT
        </a>
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
          <a
            href="/cart"
            data-cart-icon
            className={clsx(
              styles.wrapper__inner__item,
              styles.wrapper__inner__top__item,
              styles.cartWrapper
            )}
            onClick={(e) => {
              e.preventDefault();

              const pathSegments = window.location.pathname
                .split('/')
                .filter(Boolean);
              const currentPath = pathSegments.slice(1).join('/'); // uklanja lang
              const targetPath = 'cart';

              if (currentPath === targetPath) {
                // ako smo već na /[lang]/cart
                window.dispatchEvent(
                  new CustomEvent('start-route-change', {
                    detail: { href: window.location.pathname, forceOpen: true },
                  })
                );
              } else {
                // idi na /[lang]/cart
                window.dispatchEvent(
                  new CustomEvent('start-route-change', {
                    detail: { href: `/${pathSegments[0]}/cart` },
                  })
                );
              }
            }}
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
          </a>
          <div
            className={clsx(
              styles.wrapper__inner__item,
              styles.wrapper__inner__top__item,
              styles.smaller
            )}
          >
            <RandomDeliverySvg />
            <span>Nasumična porudžbina</span>
          </div>
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
