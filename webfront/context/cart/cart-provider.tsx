'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartContext } from './cart-context';
import { CartItem } from '@/types/cart';
import { CartDeliveryDict } from '@/app/[lang]/dictionaries';

const STORAGE_KEY = 'cart';

export type DeliveryInfo = {
  allowed: boolean;
  reason: DeliveryReason;
  flags: {
    hasAllowedPizza: boolean;
    hasForbiddenItems: boolean;
    hasOnlyDrinks: boolean;
  };
};

export type DeliveryReason =
  | 'empty'
  | 'onlyDrinks'
  | 'needLargePizza'
  | 'forbiddenItems'
  | null;

function getDeliveryEligibility(items: CartItem[]) {
  const isPizza = (id: string) => id?.startsWith('pizza-');
  const isSandwich = (id: string) => id?.startsWith('sandwich-');
  const isDrink = (id: string) => id?.startsWith('drink-');

  const isPizzaSmall = (item: CartItem) =>
    isPizza(item.productId) && item.size === 24;
  const isPizzaDeliveryAllowed = (item: CartItem) =>
    isPizza(item.productId) && (item.size === 32 || item.size === 50);

  const hasAnyItems = items.some((i) => i.quantity > 0);

  const hasAllowedPizza = items.some(
    (i) => i.quantity > 0 && isPizzaDeliveryAllowed(i),
  );

  const hasForbiddenItems = items.some((i) => {
    if (i.quantity <= 0) return false;
    return isPizzaSmall(i) || isSandwich(i.productId);
  });

  const hasOnlyDrinks =
    hasAnyItems && items.every((i) => i.quantity > 0 && isDrink(i.productId));

  const allowed = hasAllowedPizza && !hasForbiddenItems && !hasOnlyDrinks;

  let reason: DeliveryReason = null;

  if (!hasAnyItems) reason = 'empty';
  else if (hasOnlyDrinks) reason = 'onlyDrinks';
  else if (!hasAllowedPizza) reason = 'needLargePizza';
  else if (hasForbiddenItems) reason = 'forbiddenItems';

  return {
    allowed,
    reason,
    flags: { hasAllowedPizza, hasForbiddenItems, hasOnlyDrinks },
  };
}

export function CartProvider({
  children,
  deliveryDict,
}: {
  children: React.ReactNode;
  deliveryDict: CartDeliveryDict;
}) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [hydrated, setHydrated] = useState(false);

  // ✅ load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  // ✅ sync only AFTER hydration
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // ✅ STABILNE akcije (useCallback) -> nema promene reference svaki render
  const addToCart = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.variantId === item.variantId);
      if (existing) {
        return prev.map((p) =>
          p.variantId === item.variantId
            ? { ...p, quantity: Math.min(p.quantity + item.quantity, 10) }
            : p,
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, 10) }];
    });
  }, []);

  const removeFromCart = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((p) => p.variantId !== variantId));
  }, []);

  const updateItemQuantity = useCallback(
    (variantId: string, quantity: number) => {
      setItems((prev) =>
        prev
          .map((p) =>
            p.variantId === variantId
              ? { ...p, quantity: Math.min(Math.max(quantity, 1), 10) }
              : p,
          )
          .filter((p) => p.quantity > 0),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );
  const totalPrice = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );
  const delivery = useMemo(() => getDeliveryEligibility(items), [items]);

  // ✅ memoized value da kontekst ne pravi nove reference bespotrebno
  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      clearCart,
      totalItems,
      totalPrice,
      updateItemQuantity,
      delivery,
    }),
    [
      items,
      addToCart,
      removeFromCart,
      clearCart,
      totalItems,
      totalPrice,
      updateItemQuantity,
      delivery,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
