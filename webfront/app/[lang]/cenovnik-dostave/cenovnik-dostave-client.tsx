'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import ClientLink from '@/components/ui/client-link';
import {
  HiOutlineArrowLongLeft,
  HiOutlineBarsArrowUp,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi2';
import styles from './cenovnik-dostave.module.scss';

type ZoneRow = { zone: string; price: number };

export type DeliveryPricingDict = {
  backToHome: string;
  title: string;
  subtitle: string;

  searchPlaceholder: string;
  clearSearchAria: string;

  sortByPriceAria: string;
  sortByPriceTitle: string;

  sortByZoneAria: string;
  sortByZoneTitle: string;

  tableZone: string;
  tablePrice: string;
  currencyShort: string; // "din" / "RSD"

  emptyResults: string; // koristi {q}

  notesTitle: string;
  notes: {
    partnerPrefix: string; // npr "Dostavu vrši naš partner"
    partnerName: string; // "Fandjo NS"
    outsidePricingPrefix: string; // npr "Zone van cenovnika naplaćuju se"
    outsidePricingValue: string; // "150 din/km"
    extraStopPrefix: string; // "Svako naredno zaustavljanje naplaćuje se"
    extraStopValue: string; // "150 din"
  };
};

export default function DeliveryZonesClient({
  zones,
  t,
}: {
  zones: ZoneRow[];
  t: DeliveryPricingDict;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'zone' | 'price'>('price');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const list = zones.filter((z) => {
      if (!query) return true;
      return z.zone.toLowerCase().includes(query);
    });

    const sorted = [...list].sort((a, b) => {
      if (sort === 'price') return a.price - b.price;
      return a.zone.localeCompare(b.zone, 'sr');
    });

    return sorted;
  }, [zones, q, sort]);

  return (
    <>
      <ClientLink
        href="/"
        preserveLang
        classes={{ item: styles['zones-page__back'] }}
      >
        <HiOutlineArrowLongLeft
          className={styles['zones-page__back-icon']}
          aria-hidden="true"
        />
        <span className={styles['zones-page__back-text']}>{t.backToHome}</span>
      </ClientLink>

      <header className={styles['zones-page__header']}>
        <h1 className={styles['zones-page__title']}>{t.title}</h1>
        <p className={styles['zones-page__subtitle']}>{t.subtitle}</p>
      </header>

      <div className={styles['zones-page__controls']}>
        <div className={styles['zones-page__searchWrap']}>
          <input
            className={styles['zones-page__search']}
            placeholder={t.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className={styles['zones-page__clear']}
              onClick={() => setQ('')}
              aria-label={t.clearSearchAria}
            >
              ×
            </button>
          )}
        </div>

        <div className={styles['zones-page__sort']}>
          <button
            type="button"
            className={clsx(
              styles['zones-page__iconBtn'],
              sort === 'price' && styles['zones-page__iconBtn--active'],
            )}
            onClick={() => setSort('price')}
            aria-label={t.sortByPriceAria}
            title={t.sortByPriceTitle}
          >
            <HiOutlineCurrencyDollar
              className={styles['zones-page__icon']}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className={clsx(
              styles['zones-page__iconBtn'],
              sort === 'zone' && styles['zones-page__iconBtn--active'],
            )}
            onClick={() => setSort('zone')}
            aria-label={t.sortByZoneAria}
            title={t.sortByZoneTitle}
          >
            <HiOutlineBarsArrowUp
              className={styles['zones-page__icon']}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className={styles['zones-page__table']}>
        <div className={styles['zones-page__thead']}>
          <div>{t.tableZone}</div>
          <div className={styles['zones-page__right']}>{t.tablePrice}</div>
        </div>

        {filtered.length === 0 ? (
          <div className={styles['zones-page__empty']}>
            {t.emptyResults.replace('{q}', q)}
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.zone} className={styles['zones-page__tr']}>
              <div className={styles['zones-page__zone']}>{row.zone}</div>
              <div
                className={clsx(
                  styles['zones-page__price'],
                  styles['zones-page__right'],
                )}
              >
                {row.price} {t.currencyShort}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles['zones-page__notes']}>
        <div className={styles['zones-page__noteTitle']}>{t.notesTitle}</div>
        <ul className={styles['zones-page__noteList']}>
          <li>
            {t.notes.partnerPrefix} <strong>{t.notes.partnerName}</strong>.
          </li>
          <li>
            {t.notes.outsidePricingPrefix}{' '}
            <strong>{t.notes.outsidePricingValue}</strong>.
          </li>
          <li>
            {t.notes.extraStopPrefix} <strong>{t.notes.extraStopValue}</strong>.
          </li>
        </ul>
      </div>
    </>
  );
}
