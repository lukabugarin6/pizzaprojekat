import type { Metadata } from 'next';
import { getDictionary, type Lang } from '../dictionaries';

const baseUrl = 'https://pizzaprojekat.com';

export async function generateMetadata({
  params,
}: {
  params: { lang: Lang };
}): Promise<Metadata> {
  const { lang } = await params; // nema await
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.cart.title,
    description: dict.meta.cart.description,
    alternates: {
      canonical: `${baseUrl}/${lang}/cart`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn/cart`,
        en: `${baseUrl}/en/cart`,
        ru: `${baseUrl}/ru/cart`,
      },
    },
  };
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
