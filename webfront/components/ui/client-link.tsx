'use client';

import React, { ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  preserveLang?: boolean;
  forceOpenWhenSame?: boolean;

  // ✅ NEW: blokiraj klik ako je ista ruta
  blockWhenSame?: boolean;

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
  blockWhenSame = true, // ✅ default false
  className,
  classes,
  children,
  onClick,
  ...rest
}: Props) {
  const pathname = usePathname() || '/';

  const { lang, currentWithoutLang } = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return {
      lang: segments[0],
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
      {...rest}
      className={clsx(
        classes?.item,
        classes?.logo,
        classes?.nonHoverable,
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;

        const isSame =
          currentWithoutLang === targetWithoutLang ||
          (currentWithoutLang === '' && targetWithoutLang === '');

        // ✅ GUARD: ako je ista ruta i user hoće da blokira -> ne radi ništa
        if (blockWhenSame && isSame) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.preventDefault();

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
