import clsx from 'clsx';
import styles from './footer.module.scss';
import { FaFacebookF } from 'react-icons/fa';
import { FaInstagram } from 'react-icons/fa6';
import { PublicRestaurantHoursResponse } from '@/lib/restaurant';

type FooterDict = {
  contactPhoneLabel: string;
  addressLabel: string;
  emailLabel: string;
  mapTitle: string;
  addressText: string;
  facebookText: string;
  instagramText: string;
  // optional: ako hoćeš kasnije i label za radno vreme u footeru
  // workingHoursLabel?: string;
};

type Props = {
  t: FooterDict;
  hours?: PublicRestaurantHoursResponse | null;
};

// --- helpers (same idea as sidebar, minimal) ---
type DayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const dayShort: Record<string, Record<DayKey, string>> = {
  'sr-Latn': {
    1: 'Pon',
    2: 'Uto',
    3: 'Sre',
    4: 'Čet',
    5: 'Pet',
    6: 'Sub',
    7: 'Ned',
  },
  'en-Us': {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  },
  ru: { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' },
};

function fmtTimeRange(openTime?: string | null, closeTime?: string | null) {
  if (!openTime || !closeTime) return '';
  return `${openTime}—${closeTime}`;
}

function sameHoursKey(row: {
  isClosed: boolean;
  openTime: any;
  closeTime: any;
}) {
  if (row.isClosed) return 'CLOSED';
  return `${row.openTime ?? ''}-${row.closeTime ?? ''}`;
}

function findBestContinuousRange(weekly: any[]) {
  const byDay = new Map<number, any>();
  for (const r of weekly ?? []) byDay.set(Number(r.weekday), r);

  const days: number[] = [1, 2, 3, 4, 5, 6, 7];
  const rows = days.map((d) => ({
    weekday: d,
    row: byDay.get(d) ?? {
      weekday: d,
      isClosed: true,
      openTime: null,
      closeTime: null,
    },
  }));

  let best: {
    start: number;
    end: number;
    key: string;
    len: number;
    openPreferred: boolean;
  } | null = null;

  let i = 0;
  while (i < rows.length) {
    const k = sameHoursKey(rows[i].row);
    let j = i;
    while (j + 1 < rows.length && sameHoursKey(rows[j + 1].row) === k) j++;

    const len = j - i + 1;
    const openPreferred = k !== 'CLOSED';
    const candidate = {
      start: rows[i].weekday,
      end: rows[j].weekday,
      key: k,
      len,
      openPreferred,
    };

    if (!best) best = candidate;
    else if (candidate.len > best.len) best = candidate;
    else if (
      candidate.len === best.len &&
      candidate.openPreferred &&
      !best.openPreferred
    )
      best = candidate;

    i = j + 1;
  }

  return best;
}

function formatDayRange(start: number, end: number, langKey: string) {
  const dict = dayShort[langKey] ?? dayShort['sr-Latn'];
  const s = dict[start as DayKey] ?? String(start);
  const e = dict[end as DayKey] ?? String(end);
  if (start === end) return s;
  return `${s}–${e}`;
}

function closedLabel(langKey: string) {
  if (langKey === 'en-Us') return 'Closed';
  if (langKey === 'ru') return 'Закрыто';
  return 'Zatvoreno';
}

export default function Footer({ t, hours }: Props) {
  const lat = 45.26025575066642;
  const lon = 19.79955594233024;

  const dLat = 0.00025;
  const dLon = 0.00035;

  const bbox = `${lon - dLon}%2C${lat - dLat}%2C${lon + dLon}%2C${lat + dLat}`;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;

  // ⚠️ Footer nema lang prop; minimal fallback je sr-Latn.
  // Ako želiš 100% tačno, prosledi lang i ovde isto kao u sidebar.
  const langKey = 'sr-Latn';

  const { hoursLabel, daysLabel, isClosedNow } = (() => {
    if (!hours?.weekly?.length) {
      return { hoursLabel: '', daysLabel: '', isClosedNow: false };
    }

    const best = findBestContinuousRange(hours.weekly);
    const days = best ? formatDayRange(best.start, best.end, langKey) : '';

    const effective = hours.effective;

    const isClosedNow = !!effective?.isClosed || !hours.isOpenNow;

    if (effective?.isClosed) {
      return { hoursLabel: closedLabel(langKey), daysLabel: days, isClosedNow };
    }

    const time = fmtTimeRange(effective?.openTime, effective?.closeTime);
    if (time) return { hoursLabel: time, daysLabel: days, isClosedNow };

    if (best && best.key !== 'CLOSED') {
      const [openTime, closeTime] = best.key.split('-');
      return {
        hoursLabel: fmtTimeRange(openTime, closeTime),
        daysLabel: days,
        isClosedNow,
      };
    }

    return { hoursLabel: '', daysLabel: '', isClosedNow };
  })();

  return (
    <footer className={clsx(styles.wrapper)}>
      <div className={clsx(styles.wrapper__inner)}>
        <div className={clsx(styles.wrapper__left)}>
          <div className={clsx(styles.wrapper__left__item)}>
            <div className={clsx(styles.wrapper__left__item__label)}>
              {t.contactPhoneLabel}
            </div>
            <a
              href="tel:+381658040443"
              className={clsx(styles.wrapper__left__item__text, styles.link)}
            >
              +381 (65) 804 04 43
            </a>
          </div>

          <div className={clsx(styles.wrapper__left__item)}>
            <div className={clsx(styles.wrapper__left__item__label)}>
              {t.addressLabel}
            </div>
            <div className={clsx(styles.wrapper__left__item__text)}>
              {t.addressText}
            </div>
          </div>

          <div className={clsx(styles.wrapper__left__item)}>
            <div className={clsx(styles.wrapper__left__item__label)}>
              {t.emailLabel}
            </div>
            <a
              href="mailto:pizzaprojectns@gmail.com"
              className={clsx(styles.wrapper__left__item__text, styles.link)}
            >
              pizzaprojectns@gmail.com
            </a>
          </div>

          {/* ✅ Working hours (below email) */}
          {hoursLabel ? (
            <div className={clsx(styles.wrapper__left__item)}>
              <div className={clsx(styles.wrapper__left__item__label)}>
                Radno vreme
              </div>

              <div
                className={clsx(
                  styles.wrapper__left__item__text,
                  isClosedNow && styles.workingHoursClosed, // add this class in scss if you want
                )}
              >
                {daysLabel ? <span>{daysLabel}</span> : ''} {hoursLabel}
              </div>
            </div>
          ) : null}

          <div className={clsx(styles.wrapper__left__socials)}>
            <a
              className={clsx(styles.link, styles.socialLink)}
              href="https://www.instagram.com/pizzaprojectns__/"
              aria-label="Instagram"
              target="_blank"
            >
              <FaInstagram /> {t.instagramText}
            </a>
          </div>
        </div>

        <div className={clsx(styles.wrapper__right)}>
          <iframe
            title={t.mapTitle}
            src={src}
            className={styles.footerMap__frame}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </footer>
  );
}
