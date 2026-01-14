import clsx from 'clsx';
import styles from './footer.module.scss';
import Container from '@/components/ui/container';
import LanguageSwitcher from '@/components/ui/language-switcher';
import Link from 'next/link';
// import type { FooterDict } from '@/app/[lang]/dictionaries';
import { FaFacebookF } from 'react-icons/fa';
import { FaInstagram } from 'react-icons/fa6';
import LogoSvg from '@/components/svg/logo-svg';

type Props = {
  // t: FooterDict;
  lang?: 'sr-Latn' | 'sr-Cyrl';
};

export default function Footer({
  // t,
  lang,
}: Props) {
  const lat = 45.26025575066642;
  const lon = 19.79955594233024;

  // manji brojevi = veći zoom (bliže)
  // kreni ovde, pa po potrebi još smanji
  const dLat = 0.00025;
  const dLon = 0.00035;

  const bbox = `${lon - dLon}%2C${lat - dLat}%2C${lon + dLon}%2C${lat + dLat}`;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <footer className={clsx(styles.wrapper)}>
      <div className={clsx(styles.wrapper__inner)}>
        <div className={clsx(styles.wrapper__left)}>
          <div className={clsx(styles.wrapper__left__item)}>
            <div className={clsx(styles.wrapper__left__item__label)}>
              Kontakt telefon
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
              Adresa
            </div>
            <div className={clsx(styles.wrapper__left__item__text)}>
              Boška Petrovića 6, 21000 Novi Sad
            </div>
          </div>
          <div className={clsx(styles.wrapper__left__item)}>
            <div className={clsx(styles.wrapper__left__item__label)}>Email</div>
            <a
              href="mailto:pizzaprojectns@gmail.com"
              className={clsx(styles.wrapper__left__item__text, styles.link)}
            >
              pizzaprojectns@gmail.com
            </a>
          </div>
          <div className={clsx(styles.wrapper__left__socials)}>
            <div className={clsx(styles.link, styles.socialLink)}>
              <FaFacebookF /> facebook
            </div>
            <div className={clsx(styles.link, styles.socialLink)}>
              <FaInstagram /> instagram
            </div>
          </div>
        </div>
        <div className={clsx(styles.wrapper__right)}>
          {/* <div className={clsx(styles.footerLogo)}>
            <LogoSvg />
          </div> */}
          <iframe
            title="Pizza Project - Lokacija"
            src={src}
            className={styles.footerMap__frame}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className={styles.footerMap__label}>
            Boška Petrovića 6, Novi Sad
          </div>
        </div>
      </div>
    </footer>
  );
}
