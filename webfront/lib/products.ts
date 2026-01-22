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
): Promise<ProductsGroupedResponseDto> {
  const base = getApiBaseUrl();

  const res = await fetch(
    `${base}/products/grouped?lang=${encodeURIComponent(lang)}`,
    {
      // choose ONE strategy:
      cache: 'no-store',
      // or: next: { revalidate: 60 },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to fetch products/grouped (${res.status}): ${text}`,
    );
  }

  return res.json();
}
