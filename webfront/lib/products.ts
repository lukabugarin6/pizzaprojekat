import { type Lang } from '@/app/[lang]/dictionaries';

export type ProductVariantDto = {
  id: string;
  size: number;
  price: number;
};

export type ProductCardItemDto = {
  slug: string;
  image?: string | null;
  name: string;
  description: string;
  variants: ProductVariantDto[];
};

export type ProductsCategoryDto = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: ProductCardItemDto[];
};

export type ProductsGroupedResponseDto = {
  categories: ProductsCategoryDto[];
};

function getApiBaseUrl() {
  // Server-side (recommended): API_URL in .env (without NEXT_PUBLIC)
  const base = process.env.API_URL;
  if (!base) throw new Error('Missing API_URL env var');
  return base.replace(/\/+$/, '');
}

export async function getProductsGrouped(
  lang: Lang,
): Promise<ProductsGroupedResponseDto | null> {
  const base = getApiBaseUrl();

  try {
    const res = await fetch(
      `${base}/products/grouped?lang=${encodeURIComponent(lang)}`,
      {
        cache: 'no-store',
        // or: next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      console.error(
        'products/grouped failed',
        res.status,
        await res.text().catch(() => ''),
      );
      return null;
    }

    // dodatna zaštita: ponekad proxy/NGINX vrati HTML
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      console.error(
        'products/grouped non-json',
        ct,
        await res.text().catch(() => ''),
      );
      return null;
    }

    return (await res.json()) as ProductsGroupedResponseDto;
  } catch (err) {
    console.error('products/grouped fetch error', err);
    return null;
  }
}
