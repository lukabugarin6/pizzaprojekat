'use client';

import Carousel from '@/components/ui/carousel';
export default function CarouselDemo() {
  const slideData = [
    {
      title: 'Accademia Pizzaoli',
      text: `Jedna od najpoznatijih škola za usavršavanje pizza majstora. Vodimo se time da su ulaganje i znanje nešto što je nepogrešiva investicija.`,
      src: '/images/slider2.jpg',
    },
    {
      title: 'Naš početak',
      text: `Kad gledamo ove slike tačno nam neka muka pripadne... kad se setimo samo sređivanja, majstora i svih ostalih teškoća nije nam baš prijatno, ali s ove vremenske distance sada znamo da je vredelo.`,
      src: '/images/slider1.jpg',
    },

    {
      title: 'Iza svake pice stoji priča',
      text: 'A kad se setim da je na početku htela da me udari lopatom u glavu... 😊 Strpljenje, podrska i ljubav prema onome sto radimo se oseti u svakoj pici i sendviču koje pojedete. Za piće ne znam sta da vam kažem, to je kupovno.',
      src: '/images/slider3.jpg',
    },
  ];
  return (
    <div className="relative overflow-hidden w-full h-full py-20">
      <Carousel slides={slideData} />
    </div>
  );
}
