'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import styles from './preloader.module.scss';

type Phase = 'closing' | 'opening' | 'hidden';

export default function Preloader() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('closing');

  const isFirstLoad = useRef(true);
  const pendingHref = useRef<string | null>(null);
  const lastPathname = useRef(pathname);

  const closeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  /* ======================================
     INITIAL PAGE LOAD
  ====================================== */
  useEffect(() => {
    const onLoad = () => {
      requestAnimationFrame(() => {
        setPhase('opening');

        hideTimeout.current = setTimeout(() => {
          setPhase('hidden');
        }, 1000);
      });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
    }

    return () => {
      window.removeEventListener('load', onLoad);
      clearTimeout(hideTimeout.current);
    };
  }, []);

  /* ======================================
     ROUTE START → ZATVARANJE PANEL
  ====================================== */
  useEffect(() => {
    const handleRouteStart = (e: Event) => {
      const event = e as CustomEvent<{ href: string; forceOpen?: boolean }>;
      if (!event.detail?.href) return;

      const href = event.detail.href;

      // normalizuj path bez query
      const currentPath = pathname.replace(/^\/[^/]+/, ''); // uklanja /sr-Latn
      const targetPath = href.replace(/^\/[^/]+/, '');

      // Ako je nova ruta ista kao trenutna ili je forceOpen, samo otvori
      if (
        targetPath === currentPath ||
        (event.detail.forceOpen && targetPath === currentPath)
      ) {
        requestAnimationFrame(() => {
          setPhase('opening');
          hideTimeout.current = setTimeout(() => {
            setPhase('hidden');
          }, 1000);
        });
        return;
      }

      // normalan flow
      pendingHref.current = href;
      setPhase('closing');

      closeTimeout.current = setTimeout(() => {
        router.push(pendingHref.current!);
      }, 1000);
    };

    window.addEventListener('start-route-change', handleRouteStart);

    return () => {
      window.removeEventListener('start-route-change', handleRouteStart);
      clearTimeout(closeTimeout.current);
      clearTimeout(hideTimeout.current);
    };
  }, [pathname, router]);

  /* ======================================
     ROUTE CHANGE COMPLETE → OTVARANJE PANEL
  ====================================== */
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      lastPathname.current = pathname;
      return;
    }

    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;

      requestAnimationFrame(() => {
        setPhase('opening');

        hideTimeout.current = setTimeout(() => {
          setPhase('hidden');
          pendingHref.current = null;
        }, 1000);
      });
    }
  }, [pathname]);

  return (
    <div
      className={clsx(
        styles.wrapper,
        phase === 'opening' && styles.loaded,
        phase === 'closing' && styles.closing,
        phase === 'hidden' && styles.hidden
      )}
    >
      <div className={styles.panelTop} />
      <div className={styles.panelBottom} />
    </div>
  );
}
