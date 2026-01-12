import clsx from 'clsx';
import styles from './container.module.scss';

export default function Container({
  children,
  variant = '',
}: {
  children: React.ReactNode;
  variant?: 'without-margin' | '';
}) {
  const withoutMarginClass =
    variant === 'without-margin' ? styles.withoutMargin : '';
  return (
    <div className={clsx(styles.container, withoutMarginClass)}>{children}</div>
  );
}
