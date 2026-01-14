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

  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitReadyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔒 lock dok preloader nije hidden
  const isLocked = useRef(true);

  const clearTimers = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (waitReadyTimeout.current) clearTimeout(waitReadyTimeout.current);
    closeTimeout.current = null;
    hideTimeout.current = null;
    waitReadyTimeout.current = null;
  };

  // ✅ otvori preloader (skloni panele) ali čekaj "page-ready" da ga potpuno skloniš
  const openButWaitForReady = () => {
    requestAnimationFrame(() => {
      setPhase('opening');

      // fallback da se ne zaglavi ako page nikad ne javi ready
      waitReadyTimeout.current = setTimeout(() => {
        setPhase('hidden');
        isLocked.current = false;
        pendingHref.current = null;
      }, 1100);
    });
  };

  /* ======================================
     INITIAL PAGE LOAD
  ====================================== */
  useEffect(() => {
    const onLoad = () => {
      isLocked.current = true;
      clearTimers();
      openButWaitForReady();
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================================
     PAGE READY HANDSHAKE
  ====================================== */
  useEffect(() => {
    const onPageReady = () => {
      // kad stranica kaže da je spremna → skloni preloader
      if (waitReadyTimeout.current) {
        clearTimeout(waitReadyTimeout.current);
        waitReadyTimeout.current = null;
      }
      setPhase('hidden');
      isLocked.current = false;
      pendingHref.current = null;
    };

    window.addEventListener('page-ready', onPageReady);
    return () => window.removeEventListener('page-ready', onPageReady);
  }, []);

  /* ======================================
     ROUTE START (custom event)
  ====================================== */
  useEffect(() => {
    const handleRouteStart = (e: Event) => {
      const event = e as CustomEvent<{ href: string; forceOpen?: boolean }>;
      const href = event.detail?.href;
      if (!href) return;

      // ✅ ako smo u tranziciji / pending-u: IGNORIŠI klik
      if (isLocked.current) return;

      // lock odmah na start
      isLocked.current = true;

      clearTimers();

      const currentPath = pathname.replace(/^\/[^/]+/, '');
      const targetPath = href.replace(/^\/[^/]+/, '');

      // ako smo već na istoj ruti → samo “blink”
      if (targetPath === currentPath) {
        openButWaitForReady();
        return;
      }

      pendingHref.current = href;
      setPhase('closing');

      closeTimeout.current = setTimeout(() => {
        if (pendingHref.current) router.push(pendingHref.current);
      }, 1000);
    };

    window.addEventListener('start-route-change', handleRouteStart);
    return () => {
      window.removeEventListener('start-route-change', handleRouteStart);
      clearTimers();
    };
  }, [pathname, router]);

  /* ======================================
     ROUTE CHANGE COMPLETE
  ====================================== */
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      lastPathname.current = pathname;
      return;
    }

    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;

      // ✅ umesto da se odmah skloni, čekamo da nova strana javi "page-ready"
      openButWaitForReady();
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
      style={{ pointerEvents: phase === 'hidden' ? 'none' : 'all' }}
    >
      <div className={styles.panelTop} />
      <div className={styles.panelBottom} />
    </div>
  );
}
