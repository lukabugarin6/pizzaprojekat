import styles from './nasumicna-porudzbina.module.scss';
import { getDictionary, type Lang } from '../dictionaries';
import RandomOrderClient from './random-order-client';
import { getProductsGrouped } from '@/lib/products';

export default async function NasumicnaPorudzbinaPage({
  params,
}: {
  params: { lang: Lang };
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const home = await getProductsGrouped(lang);

  const pizzas =
    home?.categories
      ?.filter((cat) => cat.slug === 'pizza')
      .flatMap((cat) => cat.items ?? []) ?? [];

  return (
    <main className={styles['random-order']}>
      <div className={styles['random-order__container']}>
        <RandomOrderClient
          pizzas={pizzas as any}
          title={dict.randomOrder.title}
          subtitle={dict.randomOrder.subtitle}
          t={dict.randomOrderPage}
        />
      </div>
    </main>
  );
}
