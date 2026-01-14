import Link from 'next/link';
import styles from './nasumicna-porudzbina.module.scss';
import RandomOrderClient from './random-order-client';
import { pizzas } from '@/data';
import { HiOutlineArrowLongLeft } from 'react-icons/hi2';
import ClientLink from '@/components/ui/client-link';

export default function NasumicnaPorudzbinaPage() {
  return (
    <div className={styles['random-order']}>
      <RandomOrderClient pizzas={pizzas}>
        <h1 className={styles['random-order__title']}>Nasumična porudžbina</h1>
        <p className={styles['random-order__subtitle']}>
          Prepustite izbor slučaju — mi ćemo vas iznenaditi picom.
        </p>
      </RandomOrderClient>
    </div>
  );
}
