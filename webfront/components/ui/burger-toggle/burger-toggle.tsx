'use client';

import { useId, useState } from 'react';
import clsx from 'clsx';
import styles from './burger-toggle.module.scss';

type Props = {
  className?: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  label?: string;
};

export default function BurgerToggle({
  className,
  isOpen,
  onToggle,
  label = 'Toggle menu',
}: Props) {
  const autoId = useId();
  const [internal, setInternal] = useState(false);

  const open = isOpen ?? internal;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={open}
      className={clsx(styles.button, className)}
      onClick={() => {
        const next = !open;
        if (isOpen === undefined) setInternal(next);
        onToggle?.(next);
      }}
    >
      {/* ✅ state ide PRE icon */}
      <span
        className={clsx(styles.state, open && styles.stateOpen)}
        aria-hidden="true"
      />

      <span className={styles.icon}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle className={styles.circle} cx="50" cy="50" r="30" />
          <path
            className={clsx(styles.line, styles.line1)}
            d="M0 40h62c13 0 6 28-4 18L35 35"
          />
          <path className={clsx(styles.line, styles.line2)} d="M0 50h70" />
          <path
            className={clsx(styles.line, styles.line3)}
            d="M0 60h62c13 0 6-28-4-18L35 65"
          />
        </svg>
      </span>
    </button>
  );
}
