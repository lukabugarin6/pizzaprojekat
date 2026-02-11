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
    title: dict.meta.deliveryPricing.title,
    description: dict.meta.deliveryPricing.description,
    alternates: {
      canonical: `${baseUrl}/${lang}/cenovnik-dostave`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn/cenovnik-dostave`,
        en: `${baseUrl}/en/cenovnik-dostave`,
        ru: `${baseUrl}/ru/cenovnik-dostave`,
        'x-default': `${baseUrl}/sr-Latn/cenovnik-dostave`,
      },
    },
  };
}

export default function DeliveryPricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
