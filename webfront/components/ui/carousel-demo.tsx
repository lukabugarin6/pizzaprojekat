'use client';

import Carousel from '@/components/ui/carousel';

type Slide = {
  title: string;
  text: string;
  src: string;
};

export default function CarouselDemo({ t }: { t: { slides: Slide[] } }) {
  if (!t?.slides?.length) return null;

  return (
    <div className="relative overflow-hidden w-full h-full py-20">
      <Carousel slides={t.slides} />
    </div>
  );
}
