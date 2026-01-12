'use client';

import clsx from 'clsx';
import styles from './language-switcher.module.scss';
import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher({ shorter }: { shorter?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  // trenutni jezik na osnovu URL-a
  const currentLang = pathname.startsWith('/sr-Cyrl')
    ? 'sr-Cyrl'
    : pathname.startsWith('/sr-Latn')
    ? 'sr-Latn'
    : null;

  const changeTo = (locale: 'sr-Cyrl' | 'sr-Latn') => {
    const newPath = `/${locale}${pathname.replace(/^\/(sr-Cyrl|sr-Latn)/, '')}`;

    if (newPath === pathname) return;

    const currentScroll = window.scrollY;
    router.replace(newPath, { scroll: false });

    setTimeout(() => {
      window.scrollTo({
        top: currentScroll,
        behavior: 'auto',
      });
    }, 0);
  };

  return (
    <div className={clsx(styles.outerWrapper)}>
      <button
        onClick={() => changeTo('sr-Cyrl')}
        className={clsx(currentLang === 'sr-Cyrl' && styles.active)}
      >
        {shorter ? 'Ћир' : 'Ћирилица'}
      </button>

      <span className={clsx(styles.active)}>/</span>

      <button
        onClick={() => changeTo('sr-Latn')}
        className={clsx(currentLang === 'sr-Latn' && styles.active)}
      >
        {shorter ? 'Lat' : 'Latinica'}
      </button>
    </div>
  );
}
