import type { Metadata } from 'next';
import { getDictionary, type Lang } from '../dictionaries';

const baseUrl = 'https://pizzaprojekat.com';

export async function generateMetadata({
  params,
}: {
  params: { lang: Lang };
}): Promise<Metadata> {
  const { lang } = params;
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.randomOrder.title,
    description: dict.meta.randomOrder.description,
    alternates: {
      canonical: `${baseUrl}/${lang}/random-order`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn/random-order`,
        en: `${baseUrl}/en/random-order`,
        ru: `${baseUrl}/ru/random-order`,
      },
    },
  };
}

export default function RandomOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
