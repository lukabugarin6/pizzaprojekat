import clsx from 'clsx';
import styles from './products-grid.module.scss';
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
      {title ? (
        <h2 className={clsx(styles.title, titleClassName)}>{title}</h2>
      ) : null}
      <div className={clsx(styles.wrapper__inner)}>{children}</div>
    </div>
  );
}
