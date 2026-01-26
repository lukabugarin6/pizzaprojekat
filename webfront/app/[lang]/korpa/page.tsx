import { getPublicRestaurantHours } from '@/lib/restaurant';
import { getDictionary, type Lang } from '../dictionaries';
import CartPageClient from './cart-page-client';

export default async function CartPage({ params }: { params: { lang: Lang } }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const hours = await getPublicRestaurantHours();

  return (
    <main>
      <CartPageClient
        title={dict.cart.title}
        subtitle={dict.cart.subtitle}
        t={dict.cartPage}
        deliveryT={dict.cart.delivery}
        hours={hours}
      />
    </main>
  );
}
