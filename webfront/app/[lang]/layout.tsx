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
  return [{ lang: 'sr-Latn' }];
}

export async function generateMetadata({
  params,
}: {
  params: any;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.home.title,
    description: dict.meta.home.description,
    alternates: {
      languages: {
        'sr-Latn': '/sr-Latn',
        en: '/en',
        ru: '/ru',
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

        <CartProvider deliveryDict={dict.cart.delivery}>
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
                />
                <Navbar t={dict.navbar} lang={lang} />
                <div style={{ flexGrow: 1 }}>{children}</div>
                <Footer t={dict.footer} />
                <Preloader />
              </div>
            </ThemeProvider>
          </OrderTrackingProvider>
        </CartProvider>
      </body>
    </html>
  );
}
