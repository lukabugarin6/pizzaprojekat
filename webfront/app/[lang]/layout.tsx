export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Script from 'next/script';
import '../globals.css';
import ThemeProvider from '../theme-provider';
import Footer from '@/modules/global/footer';
import { getDictionary, type Lang } from './dictionaries';
import localFont from 'next/font/local';
import Sidebar from '@/modules/global/sidebar';
import Preloader from '@/components/ui/preloader';
import { CartProvider } from '@/context/cart/cart-provider';
import Navbar from '@/components/ui/navbar';
import { OrderTrackingProvider } from '@/context/order/order-tracking-context';
import GoogleAnalytics from '@/components/analytics';
import { getPublicRestaurantHours } from '@/lib/restaurant';
import { getAllProducts } from '@/lib/products';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const ptSans = localFont({
  src: [
    {
      path: '../../public/fonts/PTSansNarrow-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PTSansNarrow-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-pt-sans',
});

const robotoCondensed = localFont({
  src: [
    {
      path: '../../public/fonts/RobotoCondensed.ttf',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-roboto-condensed',
});

const planet = localFont({
  src: [
    {
      path: '../../public/fonts/home-planet-bb.regular.ttf',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-planet',
});

export async function generateStaticParams() {
  return [{ lang: 'sr-Latn' }, { lang: 'en' }, { lang: 'ru' }];
}

export async function generateMetadata({
  params,
}: {
  params: any;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const baseUrl = 'https://pizzaprojekat.com';

  return {
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    alternates: {
      canonical: `${baseUrl}/${lang}`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn`,
        en: `${baseUrl}/en`,
        ru: `${baseUrl}/ru`,
        'x-default': `${baseUrl}/sr-Latn`,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: any;
}>) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const hours = await getPublicRestaurantHours();
  const products = await getAllProducts();

  return (
    <html lang={lang}>
      <head>
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        ) : null}
      </head>

      <body
        data-preloader="true"
        className={`${ptSans.variable} ${robotoCondensed.variable} ${planet.variable} antialiased`}
      >
        {/* GA route tracking (SPA) */}
        {GA_ID ? <GoogleAnalytics /> : null}

        <CartProvider
          deliveryDict={dict.cart.delivery}
          products={products || []}
          lang={lang}
        >
          <OrderTrackingProvider
            apiBase={process.env.NEXT_PUBLIC_API_URL || ''}
            t={dict.orderStatusModal}
          >
            <ThemeProvider>
              <div
                style={{
                  minHeight: '100vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Sidebar
                  t={dict.sidebar}
                  cartT={dict.cart}
                  cartPageT={dict.cartPage}
                  hours={hours}
                />
                <Navbar t={dict.navbar} lang={lang} hours={hours} />
                <div style={{ flexGrow: 1 }}>{children}</div>
                <Footer t={dict.footer} hours={hours} />
                <Preloader />
              </div>
            </ThemeProvider>
          </OrderTrackingProvider>
        </CartProvider>
      </body>
    </html>
  );
}
