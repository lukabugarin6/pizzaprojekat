import { getDictionary, type Lang } from '../dictionaries';
import CartPageClient from './cart-page-client';

export default async function CartPage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main>
      <CartPageClient
        title={dict?.cart?.title ?? 'Korpa'}
        subtitle={
          dict?.cart?.subtitle ??
          'Pregled porudžbine i podaci za dostavu/preuzimanje.'
        }
      />
    </main>
  );
}
