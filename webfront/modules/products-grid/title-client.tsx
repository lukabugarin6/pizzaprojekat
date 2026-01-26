'use client';

import clsx from 'clsx';
import styles from './products-grid.module.scss';
import { useFadeInOnView } from '@/hooks/useFadeInOnView';

export const TitleClient = ({
  title,
  titleClassName,
}: {
  title?: string;
  titleClassName?: string;
}) => {
  const { ref, isVisible } = useFadeInOnView({ threshold: 0.25 });

  return title ? (
    <h2
      ref={ref}
      className={clsx(
        styles.title,
        titleClassName,
        isVisible && styles['title--animated'],
        isVisible && styles['title--fade-in'],
      )}
    >
      {title}
    </h2>
  ) : null;
};
