import { getDictionary, type Lang } from './dictionaries';
import HeroVideo from '@/components/ui/hero-video';
import PizzaGrid from '@/modules/products-grid';
import ProductCard from '@/components/ui/product-card';
import CarouselDemo from '@/components/ui/carousel-demo';
import { drinks, pizzas, sandwiches } from '@/data';
import ProductsFloatingNav from '@/components/ui/products-floating-nav';
import { getHello } from '@/lib/api';

export default async function HomePage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const data = await getHello();

  return (
    <main>
      <HeroVideo
        t={dict.hero}
        src="/videos/hero_31s_6mb.mp4"
        overlayOpacity={0.65}
        data={data}
      />

      <ProductsFloatingNav selector=".productGridSection" scrollOffsetPx={0} />

      <div
        className="productGridSection"
        data-nav-label={dict.home.sections.pizza}
        data-nav-id="pizza"
      >
        <PizzaGrid>
          {pizzas.map((pizza, index) => (
            <ProductCard key={index} item={pizza} />
          ))}
        </PizzaGrid>
      </div>

      <div
        className="productGridSection"
        data-nav-label={dict.home.sections.sandwiches}
        data-nav-id="sandwiches"
      >
        <PizzaGrid title={dict.home.titles.sandwiches}>
          {sandwiches.map((sandwich, index) => (
            <ProductCard key={index} item={sandwich} />
          ))}
        </PizzaGrid>
      </div>

      <div
        className="productGridSection"
        data-nav-label={dict.home.sections.drinks}
        data-nav-id="drinks"
      >
        <PizzaGrid
          smaller
          title={dict.home.titles.drinks}
          titleClassName="drinksTitle"
        >
          {drinks.map((drink, index) => (
            <ProductCard
              key={index}
              item={{
                name: drink.name, // ako i ovo prevodiš, to rešavamo sledeće
                description: '',
                variants: [{ size: 1, price: drink.price }],
                image: drink?.image,
              }}
              smaller
            />
          ))}
        </PizzaGrid>
      </div>

      <CarouselDemo t={dict.home.carousel} />
    </main>
  );
}
