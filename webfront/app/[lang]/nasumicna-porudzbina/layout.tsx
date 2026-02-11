import type { Metadata } from 'next';
import { getDictionary, type Lang } from '../dictionaries';

const baseUrl = 'https://pizzaprojekat.com';

export async function generateMetadata({
  params,
}: {
  params: { lang: Lang };
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return {
    title: dict.meta.randomOrder.title,
    description: dict.meta.randomOrder.description,
    alternates: {
      canonical: `${baseUrl}/${lang}/nasumicna-porudzbina`,
      languages: {
        'sr-Latn': `${baseUrl}/sr-Latn/nasumicna-porudzbina`,
        en: `${baseUrl}/en/nasumicna-porudzbina`,
        ru: `${baseUrl}/ru/nasumicna-porudzbina`,
        'x-default': `${baseUrl}/sr-Latn/nasumicna-porudzbina`,
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
