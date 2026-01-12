import clsx from 'clsx';
import styles from './grid.module.scss';

export default function Grid({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={clsx(styles.wrapper)}>
      {children}
    </div>
  );
}
