import clsx from 'clsx';
import styles from './footer.module.scss';
import { FaFacebookF } from 'react-icons/fa';
import { FaInstagram } from 'react-icons/fa6';

type FooterDict = {
  contactPhoneLabel: string;
  addressLabel: string;
  emailLabel: string;
  mapTitle: string;
  addressText: string;
  facebookText: string;
  instagramText: string;
};

type Props = {
  t: FooterDict;
};

export default function Footer({ t }: Props) {
  const lat = 45.26025575066642;
  const lon = 19.79955594233024;

  // manji brojevi = veći zoom (bliže)
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

          <div className={clsx(styles.wrapper__left__socials)}>
            {/* Ako imaš real linkove, samo ubaci href */}
            <a
              className={clsx(styles.link, styles.socialLink)}
              href="#"
              aria-label="Facebook"
            >
              <FaFacebookF /> {t.facebookText}
            </a>
            <a
              className={clsx(styles.link, styles.socialLink)}
              href="#"
              aria-label="Instagram"
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
