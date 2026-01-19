'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CartContext } from './cart-context';
import { CartItem } from '@/types/cart';

const STORAGE_KEY = 'cart';

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

  let reason: string | null = null;
  if (!hasAnyItems) reason = 'Korpa je prazna.';
  else if (hasOnlyDrinks) reason = 'Dostava nije moguća samo za piće.';
  else if (!hasAllowedPizza)
    reason = 'Za dostavu je potrebna bar jedna pizza 32cm ili 50cm.';
  else if (hasForbiddenItems)
    reason = 'Male pice (24cm) i sendviče ne dostavljamo :(';
  else reason = null;

  return {
    allowed,
    reason,
    flags: { hasAllowedPizza, hasForbiddenItems, hasOnlyDrinks },
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  const addToCart = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (p) => p.productId === item.productId && p.size === item.size,
      );
      if (existing) {
        return prev.map((p) =>
          p === existing ? { ...p, quantity: p.quantity + item.quantity } : p,
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (productId: string, size: number) => {
    setItems((prev) =>
      prev.filter((p) => !(p.productId === productId && p.size === size)),
    );
  };

  const clearCart = () => setItems([]);

  const updateItemQuantity = (
    productId: string,
    size: number,
    quantity: number,
  ) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.productId === productId && p.size === size ? { ...p, quantity } : p,
        )
        .filter((p) => p.quantity > 0),
    );
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = useMemo(() => getDeliveryEligibility(items), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
        updateItemQuantity,
        delivery,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
