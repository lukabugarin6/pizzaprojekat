import type { Metadata } from 'next';
import { getDictionary, type Lang } from '../dictionaries';

export async function generateMetadata({
  params,
}: {
  params: { lang: Lang };
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.deliveryPricing.title,
    description: dict.meta.deliveryPricing.description,
  };
}

export default function DeliveryPricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
