// cart-rules.ts (ili u CartProvider fajlu)

const isPizza = (id: string) => id.startsWith('pizza-');
const isSandwich = (id: string) => id.startsWith('sandwich-');
const isDrink = (id: string) => id.startsWith('drink-');

const isPizzaSmall = (item: { productId: string; size?: number }) =>
  isPizza(item.productId) && item.size === 24;

const isPizzaDeliveryAllowed = (item: { productId: string; size?: number }) =>
  isPizza(item.productId) && (item.size === 32 || item.size === 50);
