import clsx from 'clsx';
import styles from './cta.module.scss';
import ArrowSvg from '@/components/svg/arrow-svg';

export default function Cta({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button className={clsx(styles.button, styles[variant])}>
      <div>{children}</div>
      <span>
        <ArrowSvg />
      </span>
    </button>
  );
}
