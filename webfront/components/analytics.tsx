'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    // @ts-ignore
    window.gtag?.('config', GA_ID, { page_path: url });
  }, [pathname, searchParams]);

  return null;
}
