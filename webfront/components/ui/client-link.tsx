'use client';

import React, { ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;

  // ako hoćeš da automatski prefiksuješ trenutni lang (default true)
  preserveLang?: boolean;

  // ako klikneš na istu rutu, pošalji forceOpen (default true)
  forceOpenWhenSame?: boolean;

  className?: string;
  classes?: {
    item?: string;
    logo?: string;
    nonHoverable?: string;
  };

  children: ReactNode;
};

export default function ClientLink({
  href,
  preserveLang = true,
  forceOpenWhenSame = true,
  className,
  classes,
  children,
}: Props) {
  const pathname = usePathname() || '/';

  const { lang, currentWithoutLang } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return {
      lang: segments[0], // pretpostavka: prvi segment je lang
      currentWithoutLang: segments.slice(1).join('/'),
    };
  }, [pathname]);

  const resolvedHref = useMemo(() => {
    const clean = href.startsWith('/') ? href : `/${href}`;
    if (!preserveLang || !lang) return clean;

    const targetSegments = clean.split('/').filter(Boolean);
    const hasLangAlready = targetSegments[0] === lang;

    if (hasLangAlready) return clean;

    return clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
  }, [href, preserveLang, lang]);

  const targetWithoutLang = useMemo(() => {
    const seg = resolvedHref.split('/').filter(Boolean);
    return seg[0] === lang ? seg.slice(1).join('/') : seg.join('/');
  }, [resolvedHref, lang]);

  return (
    <a
      href={resolvedHref}
      className={clsx(
        classes?.item,
        classes?.logo,
        classes?.nonHoverable,
        className
      )}
      onClick={(e) => {
        e.preventDefault();

        const isSame =
          currentWithoutLang === targetWithoutLang ||
          (currentWithoutLang === '' && targetWithoutLang === '');

        window.dispatchEvent(
          new CustomEvent('start-route-change', {
            detail: {
              href: resolvedHref,
              ...(forceOpenWhenSame && isSame ? { forceOpen: true } : {}),
            },
          })
        );
      }}
    >
      {children}
    </a>
  );
}
