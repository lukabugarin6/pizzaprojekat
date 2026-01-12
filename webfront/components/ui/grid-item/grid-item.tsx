// components/ui/GridItem/GridItem.tsx
import React from 'react';
import clsx from 'clsx';
import styles from './grid-item.module.scss';

type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type GridPos = GridSpan | 'auto';

type Props = {
  children?: React.ReactNode;

  s?: GridSpan;
  m?: GridSpan;
  l?: GridSpan;
  xl?: GridSpan;
  xxl?: GridSpan;
  xxxl?: GridSpan;

  sColStart?: GridPos;
  mColStart?: GridPos;
  lColStart?: GridPos;
  xlColStart?: GridPos;
  xxlColStart?: GridPos;
  xxxlColStart?: GridPos;

  sRowStart?: GridPos;
  mRowStart?: GridPos;
  lRowStart?: GridPos;
  xlRowStart?: GridPos;
  xxlRowStart?: GridPos;
  xxxlRowStart?: GridPos;

  sMargin?: string;
  mMargin?: string;
  lMargin?: string;
  xlMargin?: string;
  xxlMargin?: string;
  xxxlMargin?: string;

  style?: React.CSSProperties;
};

export default function GridItem({
  children,
  s = 4,
  m,
  l,
  xl = 12,
  xxl,
  xxxl,

  sColStart,
  mColStart,
  lColStart,
  xlColStart,
  xxlColStart,
  xxxlColStart,

  sRowStart,
  mRowStart,
  lRowStart,
  xlRowStart,
  xxlRowStart,
  xxxlRowStart,

  sMargin,
  mMargin,
  lMargin,
  xlMargin,
  xxlMargin,
  xxxlMargin,

  style,
}: Props) {
  const className = clsx(
    styles.wrapper,

    // span
    s && styles[`s-${s}`],
    m && styles[`m-${m}`],
    l && styles[`l-${l}`],
    xl && styles[`xl-${xl}`],
    xxl && styles[`xxl-${xxl}`],
    xxxl && styles[`xxxl-${xxxl}`],

    // col-start
    sColStart && sColStart !== 'auto' && styles[`s-col-start-${sColStart}`],
    mColStart && mColStart !== 'auto' && styles[`m-col-start-${mColStart}`],
    lColStart && lColStart !== 'auto' && styles[`l-col-start-${lColStart}`],
    xlColStart && xlColStart !== 'auto' && styles[`xl-col-start-${xlColStart}`],
    xxlColStart &&
      xxlColStart !== 'auto' &&
      styles[`xxl-col-start-${xxlColStart}`],
    xxxlColStart &&
      xxxlColStart !== 'auto' &&
      styles[`xxxl-col-start-${xxxlColStart}`],

    // row-start
    sRowStart && sRowStart !== 'auto' && styles[`s-row-start-${sRowStart}`],
    mRowStart && mRowStart !== 'auto' && styles[`m-row-start-${mRowStart}`],
    lRowStart && lRowStart !== 'auto' && styles[`l-row-start-${lRowStart}`],
    xlRowStart && xlRowStart !== 'auto' && styles[`xl-row-start-${xlRowStart}`],
    xxlRowStart &&
      xxlRowStart !== 'auto' &&
      styles[`xxl-row-start-${xxlRowStart}`],
    xxxlRowStart &&
      xxxlRowStart !== 'auto' &&
      styles[`xxxl-row-start-${xxxlRowStart}`]
  );

  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(sMargin && { '--s-margin': sMargin }),
    ...(mMargin && { '--m-margin': mMargin }),
    ...(lMargin && { '--l-margin': lMargin }),
    ...(xlMargin && { '--xl-margin': xlMargin }),
    ...(xxlMargin && { '--xxl-margin': xxlMargin }),
    ...(xxxlMargin && { '--xxxl-margin': xxxlMargin }),
  } as React.CSSProperties;

  return (
    <div className={className} style={inlineStyle}>
      {children}
    </div>
  );
}
