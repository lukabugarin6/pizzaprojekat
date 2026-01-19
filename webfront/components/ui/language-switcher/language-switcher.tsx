'use client';

import clsx from 'clsx';
import styles from './language-switcher.module.scss';
import { usePathname, useRouter } from 'next/navigation';

type Locale = 'sr-Latn' | 'en' | 'ru';

const LOCALES: Locale[] = ['sr-Latn', 'en', 'ru'];

const LABELS: Record<Locale, { short: string; long: string }> = {
  'sr-Latn': { short: 'SR', long: 'Srpski' },
  en: { short: 'EN', long: 'English' },
  ru: { short: 'RU', long: 'Русский' },
};

function getLocaleFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1];
  if (first === 'sr-Latn' || first === 'en' || first === 'ru') return first;
  return 'sr-Latn'; // fallback (pick your default)
}

function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(sr-Latn|en|ru)(?=\/|$)/, '') || '/';
}

export default function LanguageSwitcher({ shorter }: { shorter?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentLang = getLocaleFromPath(pathname);
  const restPath = stripLocale(pathname);

  const changeTo = (locale: Locale) => {
    const newPath = `/${locale}${restPath === '/' ? '' : restPath}`;
    if (newPath === pathname) return;

    const currentScroll = window.scrollY;
    router.replace(newPath, { scroll: false });

    setTimeout(() => {
      window.scrollTo({ top: currentScroll, behavior: 'auto' });
    }, 0);
  };

  const visibleLocales = LOCALES.filter((l) => l !== currentLang);

  return (
    <div className={clsx(styles.outerWrapper)}>
      {visibleLocales.map((loc, idx) => (
        <span key={loc} className={styles.item}>
          <button onClick={() => changeTo(loc)}>{LABELS[loc].short}</button>
          {idx < visibleLocales.length - 1 && (
            <span className={styles.sep}> | </span>
          )}
        </span>
      ))}
    </div>
  );
}
