'use client';

import { createContext, useContext } from 'react';
import { CartItem } from '@/types/cart';

export type CartContextType = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, size: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

export const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
}
