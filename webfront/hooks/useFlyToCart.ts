'use client';

import { useCallback } from 'react';

export function useFlyToCart() {
  const flyToCart = useCallback((imageEl: HTMLImageElement | null) => {
    if (!imageEl) return;

    const cartEl = document.querySelector(
      '[data-cart-icon]'
    ) as HTMLElement | null;

    if (!cartEl) return;

    const imageRect = imageEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();

    const clone = imageEl.cloneNode(true) as HTMLImageElement;

    // 🖌 Style klona
    clone.style.position = 'fixed';
    clone.style.left = `${imageRect.left}px`;
    clone.style.top = `${imageRect.top}px`;
    clone.style.width = `${imageRect.width}px`;
    clone.style.height = `${imageRect.height}px`;
    clone.style.opacity = '0.5';
    clone.style.transform = 'scale(0.6)';
    clone.style.transformOrigin = 'top left';

    // ✨ Beli background
    clone.style.background = 'white';

    // ⏱ Samo transform transition, bez opacity fade
    clone.style.transition =
      'transform 400ms cubic-bezier(0.55, 0, 0.7, 0) 100ms';

    clone.style.zIndex = '1000';
    clone.style.pointerEvents = 'none';

    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      // 🎯 CENTER–CENTER CART TARGET
      const targetX = cartRect.left;
      const targetY = cartRect.top + cartRect.height / 2;

      const translateX = targetX - imageRect.left;
      const translateY = targetY - imageRect.top;

      clone.style.transform = `
          translate(${translateX}px, ${translateY}px)
          scale(0.4)
        `;
    });

    // ukloni klon tek nakon završetka animacije
    setTimeout(() => {
      clone.remove();
    }, 800); // malo više od 600ms + 200ms delay
  }, []);

  return { flyToCart };
}
