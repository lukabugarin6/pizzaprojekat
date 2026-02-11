import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pizzaprojekat.com';
  const languages = ['sr-Latn', 'en', 'ru'];
  const pages = ['', '/cenovnik-dostave', '/korpa', '/nasumicna-porudzbina'];

  const urls: MetadataRoute.Sitemap = [];

  languages.forEach((lang) => {
    pages.forEach((page) => {
      urls.push({
        url: `${baseUrl}/${lang}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
        alternates: {
          languages: {
            'sr-Latn': `${baseUrl}/sr-Latn${page}`,
            en: `${baseUrl}/en${page}`,
            ru: `${baseUrl}/ru${page}`,
          },
        },
      });
    });
  });

  return urls;
}
