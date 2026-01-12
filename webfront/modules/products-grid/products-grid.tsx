import clsx from 'clsx';
import styles from './products-grid.module.scss';
import Container from '@/components/ui/container';
import type { BanksTableDict } from '@/app/[lang]/dictionaries';

type ProductsGridProps = {
  t?: BanksTableDict;
  children: React.ReactNode;
  smaller?: boolean;
};

export default function ProductsGrid({
  t,
  children,
  smaller,
}: ProductsGridProps) {
  const headers = t?.headers;
  const rows = t?.data;

  return (
    <div className={clsx(styles.wrapper, smaller && styles.smaller)}>
      <div className={clsx(styles.wrapper__inner)}>{children}</div>
    </div>
  );
}
