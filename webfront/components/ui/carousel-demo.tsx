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
      title: 'Neon Nights',
      text: '',
      src: 'https://images.unsplash.com/photo-1590041794748-2d8eb73a571c?q=80&w=3456&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
  ];
  return (
    <div className="relative overflow-hidden w-full h-full py-20">
      <Carousel slides={slideData} />
    </div>
  );
}
