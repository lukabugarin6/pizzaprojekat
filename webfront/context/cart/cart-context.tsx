'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

/* ================== */
/* TYPES */
/* ================== */

export type CartItem = {
  productId: string; // slug proizvoda
  variantId: string; // ⬅️ JEDINSTVENO
  // name: string;
  image?: string;
  // description?: string;
  size?: number; // samo za prikaz (pizza)
  price: number;
  quantity: number;
};

export type DeliveryInfo = {
  allowed: boolean;
  reason: string | null;
  flags: {
    hasAllowedPizza: boolean;
    hasForbiddenItems: boolean;
    hasOnlyDrinks: boolean;
  };
};

export type CartContextType = {
  items: CartItem[];

  addToCart: (item: CartItem) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;

  updateItemQuantity: (variantId: string, quantity: number) => void;

  totalItems: number;
  totalPrice: number;

  delivery: DeliveryInfo;
};

/* ================== */
/* CONTEXT */
/* ================== */

export const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
}

/* ================== */
/* PROVIDER */
/* ================== */

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  /* ================== */
  /* ACTIONS */
  /* ================== */

  const addToCart = (newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.variantId === newItem.variantId,
      );

      if (existing) {
        return prev.map((item) =>
          item.variantId === newItem.variantId
            ? {
                ...item,
                quantity: Math.min(item.quantity + newItem.quantity, 10),
              }
            : item,
        );
      }

      return [...prev, newItem];
    });
  };

  const removeFromCart = (variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const updateItemQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return;

    setItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.min(quantity, 10) }
          : item,
      ),
    );
  };

  /* ================== */
  /* DERIVED VALUES */
  /* ================== */

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  /* ================== */
  /* DELIVERY RULES (basic) */
  /* ================== */

  const delivery: DeliveryInfo = useMemo(() => {
    const hasPizza = items.some((item) => item.size != null);
    const hasOnlyDrinks =
      items.length > 0 && items.every((item) => item.size == null);

    return {
      allowed: hasPizza || items.length === 0,
      reason:
        !hasPizza && items.length > 0
          ? 'Dostava je moguća samo uz poručenu picu.'
          : null,
      flags: {
        hasAllowedPizza: hasPizza,
        hasForbiddenItems: false,
        hasOnlyDrinks,
      },
    };
  }, [items]);

  /* ================== */
  /* VALUE */
  /* ================== */

  const value: CartContextType = {
    items,
    addToCart,
    removeFromCart,
    clearCart,
    updateItemQuantity,
    totalItems,
    totalPrice,
    delivery,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
