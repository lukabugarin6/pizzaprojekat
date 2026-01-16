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
      <div style={{ position: 'relative' }}>
        <PizzaGrid>
          {pizzas.map((pizza, index) => (
            <ProductCard key={index} item={pizza} />
          ))}
        </PizzaGrid>
      </div>
      <div style={{ position: 'relative' }}>
        {/* <div className={styles.banner}>
          <Image
            src="/images/testsend.webp"
            alt="sandwiches-banner"
            width={1000}
            height={1000}
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'cover',
              aspectRatio: '3 / 1',
              objectPosition: '50% 50%',
            }}
          />
        </div> */}
        <h1
          style={{
            color: '#000',
            fontSize: 102,
            fontWeight: 900,
            textAlign: 'center',
            margin: '60px 0 30px',
            fontFamily: 'var(--font-roboto-condensed)',
          }}
        >
          SENDVIČI
        </h1>
        <PizzaGrid>
          {sandwiches.map((sandwich, index) => (
            <ProductCard key={index} item={sandwich} />
          ))}
        </PizzaGrid>
      </div>
      <h1
        style={{
          color: '#000',
          fontSize: 102,
          fontWeight: 900,
          textAlign: 'center',
          fontFamily: 'var(--font-roboto-condensed)',
        }}
      >
        PIĆE
      </h1>
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
    </main>
  );
}
