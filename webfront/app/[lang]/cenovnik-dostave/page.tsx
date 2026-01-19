import styles from './cenovnik-dostave.module.scss';
import DeliveryZonesClient from './cenovnik-dostave-client';
import { getDictionary, type Lang } from '../dictionaries';

const deliveryZones = [
  { zone: 'Grad', price: 400 },
  { zone: 'Bajić žilinskog - BIG', price: 500 },
  { zone: 'Ribarsko ostrvo', price: 500 },
  { zone: 'Adice', price: 550 },
  { zone: 'Sajlovo', price: 650 },
  { zone: 'Kamenjari', price: 650 },
  { zone: 'Veternik', price: 650 },
  { zone: 'Klisa', price: 650 },
  { zone: 'Petrovaradin', price: 650 },
  { zone: 'Sremska Kamenica', price: 650 },
  { zone: 'Ribnjak', price: 650 },
  { zone: 'Bangladeš', price: 750 },
  { zone: 'Klisa - Sole Mio', price: 850 },
  { zone: 'Alibegovac - Karagaća', price: 900 },
  { zone: 'Čardak', price: 900 },
  { zone: 'Bocke', price: 1000 },
  { zone: 'Popovica', price: 1000 },
  { zone: 'Paragovo', price: 1000 },
  { zone: 'Zrenjaninski put', price: 1000 },
  { zone: 'Sangaj', price: 1000 },
  { zone: 'Puckaroš', price: 1200 },
  { zone: 'Futog', price: 1200 },
  { zone: 'Rumenka', price: 1300 },
  { zone: 'Bukovac', price: 1400 },
  { zone: 'Čenej', price: 1400 },
  { zone: 'Ledinci', price: 1400 },
  { zone: 'Sremski Karlovci', price: 1600 },
];

export default async function CenovnikDostavePage({
  params,
}: {
  params: { lang: Lang };
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className={styles['zones-page']}>
      <div className={styles['zones-page__container']}>
        <DeliveryZonesClient zones={deliveryZones} t={dict.deliveryPricing} />
      </div>
    </div>
  );
}
