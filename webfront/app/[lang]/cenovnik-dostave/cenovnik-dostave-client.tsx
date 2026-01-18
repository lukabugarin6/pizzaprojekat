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

export default function DeliveryZonesClient({ zones }: { zones: ZoneRow[] }) {
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
        <span className={styles['zones-page__back-text']}>
          Nazad na početnu
        </span>
      </ClientLink>

      <header className={styles['zones-page__header']}>
        <h1 className={styles['zones-page__title']}>Cenovnik dostave</h1>
        <p className={styles['zones-page__subtitle']}>
          Pronađite svoju zonu i cenu dostave.
        </p>
      </header>

      <div className={styles['zones-page__controls']}>
        <div className={styles['zones-page__searchWrap']}>
          <input
            className={styles['zones-page__search']}
            placeholder="Pretraži zonu (npr. Veternik, Klisa...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className={styles['zones-page__clear']}
              onClick={() => setQ('')}
              aria-label="Obriši pretragu"
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
            aria-label="Sortiraj po ceni"
            title="Sortiraj po ceni"
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
            aria-label="Sortiraj po nazivu (A–Z)"
            title="Sortiraj po nazivu (A–Z)"
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
          <div>Zona grada</div>
          <div className={styles['zones-page__right']}>Cena</div>
        </div>

        {filtered.length === 0 ? (
          <div className={styles['zones-page__empty']}>
            Nema rezultata za “{q}”.
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
                {row.price} din
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles['zones-page__notes']}>
        <div className={styles['zones-page__noteTitle']}>Napomene</div>
        <ul className={styles['zones-page__noteList']}>
          <li>
            Dostavu vrši naš partner <strong>Fandjo NS</strong>.
          </li>
          <li>
            Zone van cenovnika naplaćuju se <strong>150 din/km</strong>.
          </li>
          <li>
            Svako naredno zaustavljanje naplaćuje se <strong>150 din</strong>.
          </li>
        </ul>
      </div>
    </>
  );
}
