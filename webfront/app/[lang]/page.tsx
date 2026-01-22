import { getDictionary, type Lang } from './dictionaries';
import HeroVideo from '@/components/ui/hero-video';
import PizzaGrid from '@/modules/products-grid';
import ProductCard from '@/components/ui/product-card';
import CarouselDemo from '@/components/ui/carousel-demo';
import ProductsFloatingNav from '@/components/ui/products-floating-nav';
import { getProductsGrouped } from '@/lib/products';

export default async function HomePage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const home = await getProductsGrouped(lang);

  return (
    <main>
      <HeroVideo
        t={dict.hero}
        src="/videos/hero_31s_6mb.mp4"
        overlayOpacity={0.65}
      />
      <ProductsFloatingNav selector=".productGridSection" scrollOffsetPx={0} />
      {home &&
        home.categories.length > 0 &&
        home.categories.map((cat) => {
          return (
            <div
              key={cat.id}
              className="productGridSection"
              data-nav-id={cat.slug}
              data-nav-label={cat.name}
              title={cat.name}
            >
              <PizzaGrid>
                {cat.items.map((item) => (
                  <ProductCard key={item.slug} item={item} />
                ))}
              </PizzaGrid>
            </div>
          );
        })}

      <CarouselDemo t={dict.home.carousel} />
    </main>
  );
}
