import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const locales = ['sr-Latn', 'en', 'ru'] as const;
type Locale = (typeof locales)[number];

// regex za statičke fajlove (možeš proširiti po potrebi)
const PUBLIC_FILE =
  /\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt|pdf|mp4|json)$/i;

function getLocale(request: NextRequest): Locale {
  // const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  // if (cookieLocale && locales.includes(cookieLocale as Locale)) {
  //   return cookieLocale as Locale;
  // }

  const header = request.headers.get('accept-language');
  if (header) {
    for (const part of header.split(',')) {
      const lang = part.split(';')[0]?.trim();
      if (locales.includes(lang as Locale)) {
        return lang as Locale;
      }
    }
  }

  return 'sr-Latn';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) ignoriši Next interne i API
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return;
  }

  // 2) ignoriši statičke fajlove iz /public
  if (PUBLIC_FILE.test(pathname)) {
    // vraća NextResponse.next() umesto undefined, da middleware ne blokira
    return NextResponse.next();
  }
  // if (fs.existsSync(path.join(process.cwd(), 'public', pathname))) {
  //   return;
  // }

  // 3) ako već ima locale u path-u, ne diraj
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    return;
  }

  // 4) dodaj locale samo za "prave" stranice
  const locale: Locale = 'sr-Latn';
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!_next|docs|api).*)'],
};
