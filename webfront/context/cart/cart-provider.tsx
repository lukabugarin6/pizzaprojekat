'use client';

import { useEffect, useState } from 'react';
import { CartContext } from './cart-context';
import { CartItem } from '@/types/cart';

const STORAGE_KEY = 'cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // load
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {
        setItems([]);
      }
    }
  }, []);

  // sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (p) => p.productId === item.productId && p.size === item.size
      );

      if (existing) {
        return prev.map((p) =>
          p === existing ? { ...p, quantity: p.quantity + item.quantity } : p
        );
      }

      return [...prev, item];
    });
  };

  const removeFromCart = (productId: string, size: number) => {
    setItems((prev) =>
      prev.filter((p) => !(p.productId === productId && p.size === size))
    );
  };

  const clearCart = () => setItems([]);

  // 👇 NOVO – update quantity
  const updateItemQuantity = (
    productId: string,
    size: number,
    quantity: number
  ) => {
    setItems((prev) =>
      prev.map((p) =>
        p.productId === productId && p.size === size ? { ...p, quantity } : p
      )
    );
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
        updateItemQuantity, // 👈 prosleđeno
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
