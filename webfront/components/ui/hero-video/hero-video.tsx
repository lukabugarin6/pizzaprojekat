'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import styles from './hero-video.module.scss';
import LogoSvg from '@/components/svg/logo-svg';
import { useSmoothScrollToVh } from '@/hooks/useSmoothScrollToVh';

type HeroDict = { cta: string };

type HeroVideoProps = {
  src: string;
  poster?: string;
  overlayOpacity?: number;
  className?: string;
  children?: React.ReactNode;
  t: HeroDict;
};

export default function HeroVideo({
  src,
  poster,
  overlayOpacity = 0.35,
  className,
  children,
  t,
}: HeroVideoProps) {
  const scrollToNextSection = useSmoothScrollToVh(750, 1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const tryPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      // neki browseri vole da currentTime nije 0
      if (v.currentTime < 0.0001) v.currentTime = 0.0001;

      const p = v.play();
      if (p && typeof (p as Promise<void>).then === 'function') {
        await p;
      }
    } catch (e) {
      // autoplay blocked / network issue
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setIsReady(false);
    setHasError(false);

    const onCanPlay = () => setIsReady(true);
    const onPlaying = () => setIsReady(true);
    const onError = () => setHasError(true);
    const onStalled = () => setHasError(true);

    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('error', onError);
    v.addEventListener('stalled', onStalled);

    // pokušaj odmah
    tryPlay();

    // retry kad se user vrati na tab (često rešava Safari/Chrome edge)
    const onVis = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('error', onError);
      v.removeEventListener('stalled', onStalled);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [src, tryPlay]);

  const showPoster = !!poster && (!isReady || hasError);

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
      </div>

      {/* Poster fallback (iza videa) */}
      {showPoster && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Video */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="auto"
        autoPlay
        poster={poster}
        aria-hidden="true"
        // mali trik: ako ne radi video, bar poster ostaje
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: showPoster ? 0 : 1,
        }}
      >
        <source src={src} type="video/mp4" />
      </video>

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

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </section>
  );
}
