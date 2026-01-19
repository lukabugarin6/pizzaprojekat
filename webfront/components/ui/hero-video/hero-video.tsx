'use client';

import LogoSvg from '@/components/svg/logo-svg';
import React, { useEffect, useRef } from 'react';
import styles from './hero-video.module.scss';
import clsx from 'clsx';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';

type HeroDict = {
  cta: string;
};

type HeroVideoProps = {
  src: string;
  poster?: string;
  minHeight?: string;
  overlayOpacity?: number;
  className?: string;
  children?: React.ReactNode;
  t: HeroDict;
  data?: any;
};

export default function HeroVideo({
  src,
  poster,
  overlayOpacity = 0.35,
  className,
  children,
  data,
  t,
}: HeroVideoProps) {
  const scrollToNextSection = useSmoothScrollToVh(750, 1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const seek = () => {
      try {
        if (v.currentTime < 0.0001) v.currentTime = 0.0001;
      } catch {}
    };

    seek();
    v.addEventListener('loadedmetadata', seek);

    return () => {
      v.removeEventListener('loadedmetadata', seek);
    };
  }, [src]);

  return (
    <section className={clsx(styles.wrapper, className)}>
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
        <h5 className={clsx(styles.wrapper__logoAndText__text)}>{t.cta}</h5>
        <p>{data}</p>
      </div>

      {/* Background video */}
      <div>
        <video
          ref={videoRef}
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
