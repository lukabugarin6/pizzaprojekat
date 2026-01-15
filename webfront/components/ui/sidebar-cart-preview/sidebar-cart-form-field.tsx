'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './sidebar-cart-preview.module.scss';

type SidebarCartFormFieldProps = {
  as?: 'input' | 'textarea';
  leftIcon?: React.ReactNode;
  listId?: string;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function SidebarCartFormField({
  as = 'input',
  leftIcon,
  listId,
  className,
  ...rest
}: SidebarCartFormFieldProps) {
  const isTextarea = as === 'textarea';

  const inputClassName = clsx(
    styles['sidebar-cart__form-input'],
    isTextarea && styles['sidebar-cart__form-input--textarea'],
    leftIcon && styles['sidebar-cart__form-input--with-icon'],
    className
  );

  return (
    <div className={styles['sidebar-cart__form-field']}>
      {leftIcon && (
        <span className={styles['sidebar-cart__form-field-icon']}>
          {leftIcon}
        </span>
      )}

      {isTextarea ? (
        <textarea
          className={inputClassName}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={inputClassName}
          list={listId}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
}
