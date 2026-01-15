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

export default async function HomePage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main>
      <HeroVideo src="/videos/hero_31s_6mb.mp4" overlayOpacity={0.65} />
      {/* <div
        style={{
          position: 'fixed',
          top: 0,
          left: 175,
          background: '#000',
          height: 40,
          width: 'calc(100% - 175px)',
          zIndex: 50,
        }}
      >
        Ne dostavljamo male pice i sendvice
      </div> */}
      {/* Pizze */}
      <div style={{ position: 'relative' }}>
        {/* <PizzaFilters /> */}
        <PizzaGrid>
          {pizzas.map((pizza, index) => (
            <ProductCard key={index} item={pizza} />
          ))}
        </PizzaGrid>
      </div>

      {/* Sendviči */}
      <div style={{ position: 'relative' }}>
        <div className={styles.banner}>
          <Image
            src="/images/sendvici-baner-en.png"
            alt="sandwiches-banner"
            width={1000}
            height={1000}
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'cover',
              aspectRatio: '2.3 / 1',
            }}
          />
        </div>
        <PizzaGrid>
          {sandwiches.map((sandwich, index) => (
            <ProductCard key={index} item={sandwich} />
          ))}
        </PizzaGrid>
      </div>

      {/* Pića */}
      <div style={{ position: 'relative' }}>
        <div className={clsx(styles.banner, styles['banner--smaller'])}>
          <Image
            src="/images/pice-baner-en.png"
            alt="drinks-banner"
            width={1000}
            height={1000}
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'cover',
              aspectRatio: '3 / 1',
            }}
          />
        </div>
        <PizzaGrid smaller>
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
        <CarouselDemo />
      </div>
    </main>
  );
}
