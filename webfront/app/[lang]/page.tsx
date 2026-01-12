import { getDictionary, type Lang } from './dictionaries';
import HeroVideo from '@/components/ui/hero-video';
import PizzaGrid from '@/modules/products-grid';
import ProductCard from '@/components/ui/product-card';
import PizzaFilters from '@/components/ui/pizza-filters';
import styles from './home.module.scss';
import Image from 'next/image';
import clsx from 'clsx';
import CarouselDemo from '@/components/ui/carousel-demo';

export default async function HomePage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const pizzas = [
    {
      name: 'Kaprićoza',
      description: 'Pelat, šunka, sir, šampinjoni, origano',
      image: '/images/kapricoza.png',
      variants: [
        { size: 24, price: 460 },
        { size: 32, price: 800 },
        { size: 50, price: 1500 },
      ],
    },
    {
      name: 'Mađarica',
      description: 'Pelat, šunka, sir, kulen, feferone',
      image: '/images/madjarica.png',
      variants: [
        { size: 24, price: 520 },
        { size: 32, price: 900 },
        { size: 50, price: 1600 },
      ],
    },
    {
      name: 'Peperoni',
      description: 'Pelat, šunka, sir, peperoni kobasica, feferone',
      image: '/images/peperoni.png',
      variants: [
        { size: 24, price: 520 },
        { size: 32, price: 900 },
        { size: 50, price: 1600 },
      ],
    },
    {
      name: 'Vojvođanka',
      description: 'Pelat, šunka, sir, pančeta, čeri paradajz',
      image: '/images/vojvodjanka.png',
      variants: [
        { size: 24, price: 520 },
        { size: 32, price: 900 },
        { size: 50, price: 1600 },
      ],
    },
    {
      name: 'Project Pizza',
      description: 'Pelat, šunka, sir, duvan čvarci, pavlaka',
      image: '/images/project-pizza.png',
      variants: [
        { size: 24, price: 540 },
        { size: 32, price: 960 },
        { size: 50, price: 1700 },
      ],
    },
    {
      name: 'Komšijska pizza',
      description: 'Pelat, šunka, sir, pančeta, kulen, čeri paradajz',
      image: '',
      variants: [
        { size: 24, price: 580 },
        { size: 32, price: 1040 },
        { size: 50, price: 1800 },
      ],
    },
    {
      name: 'Pršuta',
      description: 'Pelat, sir, pršuta, masline, rukola',
      image: '/images/prsuta.png',
      variants: [
        { size: 24, price: 540 },
        { size: 32, price: 960 },
        { size: 50, price: 1700 },
      ],
    },
    {
      name: 'Margarita',
      description: 'Pelat, sir, masline, suvi bosiljak',
      image: '/images/margarita.png',
      variants: [
        { size: 24, price: 460 },
        { size: 32, price: 800 },
        { size: 50, price: 1500 },
      ],
    },
    {
      name: 'Vegetarijana',
      description: 'Pelat, sir, šampinjoni, rukola, čeri paradajz, masline',
      image: '',
      variants: [
        { size: 24, price: 460 },
        { size: 32, price: 800 },
        { size: 50, price: 1500 },
      ],
    },
  ];

  const sandwiches = [
    {
      name: 'Šunka',
      description: 'Pavlaka, šunka, sir, kečap, majonez, čeri paradajz',
      image: '',
      variants: [{ size: 1, price: 460 }],
    },
    {
      name: 'Kulen',
      description: 'Pavlaka, sir, kulen, majonez, kečap, čeri paradajz',
      image: '',
      variants: [{ size: 1, price: 520 }],
    },
    {
      name: 'Pršuta',
      description: 'Pavlaka, sir, pršuta, majonez, kečap, čeri paradajz',
      image: '',
      variants: [{ size: 1, price: 540 }],
    },
  ];

  const drinks = [
    { name: 'Coca cola 0,33', price: 100, image: '/images/cola-tr.png' },
    { name: 'Cola zero 0,33', price: 100 },
    { name: 'Fanta 0,33', price: 100, image: '/images/fanta.png' },
    { name: 'Sprite 0,33', price: 100 },
    { name: 'Schweppes 0,33', price: 100 },
    { name: 'Rosa 0,5', price: 90 },
    { name: 'Rosa mineralna 0,5', price: 90 },
    { name: 'Next jabuka 0,2', price: 90 },
    { name: 'Next narandža 0,2', price: 90 },
  ];

  return (
    <main>
      <HeroVideo src="/videos/output.mp4" overlayOpacity={0.65} />
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
