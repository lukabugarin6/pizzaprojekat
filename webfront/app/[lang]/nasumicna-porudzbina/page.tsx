import styles from './nasumicna-porudzbina.module.scss';
import { getDictionary, type Lang } from '../dictionaries';
import RandomOrderClient from './random-order-client';
import { pizzas } from '@/data';

export default async function NasumicnaPorudzbinaPage({
  params,
}: {
  params: { lang: Lang };
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className={styles['random-order']}>
      <div className={styles['random-order__container']}>
        <RandomOrderClient
          pizzas={pizzas}
          title={dict.randomOrder.title}
          subtitle={dict.randomOrder.subtitle}
          t={dict.randomOrderPage}
        />
      </div>
    </main>
  );
}
