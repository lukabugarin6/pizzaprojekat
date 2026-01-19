import type { Metadata } from 'next';
import '../globals.css';
import ThemeProvider from '../theme-provider';
import Footer from '@/modules/global/footer';
import { getDictionary, type Lang } from './dictionaries';
import localFont from 'next/font/local';
import Sidebar from '@/modules/global/sidebar';
import Preloader from '@/components/ui/preloader';
import { CartProvider } from '@/context/cart/cart-provider';
import Navbar from '@/components/ui/navbar';

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
      <body
        data-preloader="true"
        className={`${ptSans.variable} ${robotoCondensed.variable} ${planet.variable} antialiased`}
      >
        <ThemeProvider>
          {/* prosleđujemo samo deo za navbar */}
          {/* <Navbar t={dict.navbar} lang={lang} /> */}
          {/* <NavbarResponsive t={dict.navbar} lang={lang} /> */}

          <CartProvider>
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Sidebar t={dict.sidebar} />{' '}
              <Navbar t={dict.navbar} lang={lang} />
              <div style={{ flexGrow: 1 }}>{children}</div>
              <Footer t={dict.footer} />
              <Preloader />
            </div>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
