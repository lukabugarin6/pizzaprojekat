'use client';

import HeroLogoSvg from '@/components/svg/hero-logo-svg';
import LogoSvg from '@/components/svg/logo-svg';
import React from 'react';
import styles from './hero-video.module.scss';
import clsx from 'clsx';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';

type HeroVideoProps = {
  src: string;
  poster?: string;
  minHeight?: string;
  overlayOpacity?: number;
  className?: string;
  children?: React.ReactNode;
};

export default function HeroVideo({
  src,
  poster,
  overlayOpacity = 0.35,
  children,
}: HeroVideoProps) {
  const scrollToNextSection = useSmoothScrollToVh(750);

  return (
    <section className={clsx(styles.wrapper)}>
      <div
        className={clsx(styles.wrapper__logoAndText)}
        onClick={scrollToNextSection}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') scrollToNextSection();
        }}
      >
        <LogoSvg />
        <h5 className={clsx(styles.wrapper__logoAndText__text)}>
          Poručite online vašu omiljenu picu
        </h5>
      </div>

      {/* Background video */}
      <div>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          controls={false}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      {/* Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </section>
  );
}
