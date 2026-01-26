import clsx from 'clsx';
import styles from './products-grid.module.scss';
import { useFadeInOnView } from '@/hooks/useFadeInOnView';
import { TitleClient } from './title-client';
// import type { BanksTableDict } from '@/app/[lang]/dictionaries';

type ProductsGridProps = {
  // t?: BanksTableDict;
  children: React.ReactNode;
  smaller?: boolean;
  title?: string;
  titleClassName?: string; // opciono ako hoces dodatne klase
};

export default function ProductsGrid({
  // t,
  children,
  smaller,
  title,
  titleClassName,
}: ProductsGridProps) {
  // const headers = t?.headers;
  // const rows = t?.data;

  return (
    <div className={clsx(styles.wrapper, smaller && styles.smaller)}>
      <TitleClient title={title} titleClassName={titleClassName} />
      <div className={clsx(styles.wrapper__inner)}>{children}</div>
    </div>
  );
}
