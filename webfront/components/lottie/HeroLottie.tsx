'use client';

import Lottie from 'lottie-react';
import animationData from '@/public/lottie/lottie.json';

type Props = {
  className?: string;
};

export default function HeroLottie({ className }: Props) {
  return (
    <Lottie
      animationData={animationData}
      loop={true}
      autoplay={true}
      className={className}
    />
  );
}
