import type { Metadata } from 'next';
import { getDictionary, type Lang } from '../dictionaries';

const baseUrl = 'https://pizzaprojekat.com';

export async function generateMetadata({
  params,
}: {
  params: { lang: Lang };
}): Promise<Metadata> {
  const { lang } = params; // nema await
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.deliveryPricing.title,
    description: dict.meta.deliveryPricing.description,
    alternates: {
      canonical: `${baseUrl}/${lang}/delivery-pricing`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn/delivery-pricing`,
        en: `${baseUrl}/en/delivery-pricing`,
        ru: `${baseUrl}/ru/delivery-pricing`,
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
