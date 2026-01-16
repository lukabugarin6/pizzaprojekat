import { getDictionary, type Lang } from './dictionaries';
import HeroVideo from '@/components/ui/hero-video';
import PizzaGrid from '@/modules/products-grid';
import ProductCard from '@/components/ui/product-card';
import PizzaFilters from '@/components/ui/pizza-filters';
import styles from './home.module.scss';
import Image from 'next/image';
import clsx from 'clsx';
import CarouselDemo from '@/components/ui/carousel-demo';
import { drinks, pizzas, sandwiches } from '@/data';
import ProductsFloatingNav from '@/components/ui/products-floating-nav';

export default async function HomePage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main>
      <HeroVideo src="/videos/hero_31s_6mb.mp4" overlayOpacity={0.65} />
      <ProductsFloatingNav selector=".productGridSection" scrollOffsetPx={0} />
      <div className="productGridSection" data-nav-label="Pizza">
        <PizzaGrid>
          {pizzas.map((pizza, index) => (
            <ProductCard key={index} item={pizza} />
          ))}
        </PizzaGrid>
      </div>
      <div className="productGridSection" data-nav-label="Sendviči">
        <PizzaGrid title="SENDVIČI">
          {sandwiches.map((sandwich, index) => (
            <ProductCard key={index} item={sandwich} />
          ))}
        </PizzaGrid>
      </div>
      <div className="productGridSection" data-nav-label="Piće">
        <PizzaGrid smaller title="PIĆE">
          {drinks.map((drink, index) => (
            <ProductCard
              key={index}
              item={{
                name: drink.name,
                description: '',
                variants: [{ size: 1, price: drink.price }],
                image: drink?.image,
              }}
              smaller
            />
          ))}
        </PizzaGrid>
      </div>
      <CarouselDemo />
    </main>
  );
}
