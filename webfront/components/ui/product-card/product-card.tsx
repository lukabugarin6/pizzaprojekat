'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './product-card.module.scss';
import Image from 'next/image';
import { useFadeInOnView } from '@/hooks/useFadeInOnView';
import HandPointerSvg from '@/components/svg/hand-pointer-svg';
import { CiRuler } from 'react-icons/ci';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import { useCart } from '@/context/cart/cart-context';

export default function ProductCard({
  item,
  smaller,
}: {
  item?: any;
  smaller?: boolean;
}) {
  const [overlayQuantity, setOverlayQuantity] = useState(0);
  const { addToCart } = useCart();

  const imageRef = useRef<HTMLImageElement | null>(null);
  const { flyToCart } = useFlyToCart();

  const { ref, isVisible } = useFadeInOnView({ threshold: 0.25 });

  const variants = item?.variants || [];

  // ima li varijanti uopšte
  const hasVariants = variants.length > 0;

  // da li varijante imaju "size" (pizze), ili nemaju (sendviči)
  const variantsHaveSize = useMemo(() => {
    return variants.some((v: any) => v?.size != null);
  }, [variants]);

  const hasMultipleVariants = variantsHaveSize && variants.length > 1;

  // init selectedSize samo ako varijante imaju size
  const [selectedSize, setSelectedSize] = useState<number | null>(() => {
    if (!hasVariants) return null;
    if (!variants.some((v: any) => v?.size != null)) return null;

    const sizes = variants
      .map((v: any) => Number(v.size))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    return sizes.length ? Math.max(...sizes) : null;
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [showOverlay, setShowOverlay] = useState(false);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    // pizze: biramo po size
    if (variantsHaveSize) {
      return variants.find((v: any) => v.size === selectedSize) ?? null;
    }

    // sendviči: prva (jedina) varijanta
    return variants[0] ?? null;
  }, [hasVariants, variants, variantsHaveSize, selectedSize]);

  // ✅ cena: prioritet variant.price, fallback item.price (pića)
  const unitPrice = useMemo(() => {
    if (selectedVariant?.price != null)
      return Number(selectedVariant.price) || 0;
    if (item?.price != null) return Number(item.price) || 0;
    return 0;
  }, [selectedVariant, item]);

  const totalPrice = unitPrice * quantity;

  const increaseQty = () => setQuantity((prev) => Math.min(prev + 1, 10));
  const decreaseQty = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleAddToCart = () => {
    // mora da ima cenu (bar 1 din) da bi imalo smisla
    if (!unitPrice) return;

    flyToCart(imageRef.current);

    addToCart({
      productId: item.id,
      name: item.name,
      image: item.image,
      description: item.description,

      // ✅ size samo kad postoji (pizze)
      ...(variantsHaveSize && selectedVariant?.size != null
        ? { size: selectedVariant.size }
        : {}),

      price: unitPrice,
      quantity,
    });

    const justAdded = quantity;

    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 2000);

    setQuantity(1);

    // reset size samo kod pizza (da ostane na najvećoj ili kako želiš)
    // setSelectedSize(variantsHaveSize ? selectedSize : null);

    setOverlayQuantity(justAdded);
  };

  return (
    <div
      ref={ref}
      className={clsx(
        styles['product-card'],
        isVisible && styles['product-card--animated'],
        isVisible && styles['product-card--fade-in'],
        smaller && styles['product-card--smaller'],
      )}
    >
      <div className={styles['product-card__inner']}>
        <div className={styles['product-card__img-wrapper']}>
          <Image
            ref={imageRef}
            src={item?.image || '/images/pp-logo.jpg'}
            alt={item?.name}
            width={1000}
            height={1000}
            sizes="100vw"
          />
        </div>

        <div className={styles['product-card__content']}>
          <h4>{item?.name}</h4>
          {item?.description && <p>{item?.description}</p>}

          {hasMultipleVariants && (
            <div className={styles['product-card__variants-wrapper']}>
              <h5>
                <CiRuler size={34} /> Veličina
              </h5>
              <div className={styles['product-card__sizes']}>
                {variants.map((variant: any) => (
                  <button
                    key={variant.size}
                    type="button"
                    onClick={() => setSelectedSize(variant.size)}
                    className={clsx(
                      styles['product-card__size-btn'],
                      selectedSize === variant.size &&
                        styles['product-card__size-btn--active'],
                    )}
                  >
                    {variant.size} cm
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles['product-card__price']}>{totalPrice} RSD</div>

          {/* ✅ prikazuj footer ako ima cenu (sendviči i pića rade) */}
          {unitPrice > 0 && (
            <div className={styles['product-card__footer']}>
              {showOverlay && (
                <div className={styles['product-card__overlay']}>
                  <span>Uspešno ste dodali u korpu! (+{overlayQuantity})</span>
                </div>
              )}

              <div className={styles['product-card__actions']}>
                <button
                  className={styles['product-card__order-btn']}
                  type="button"
                  onClick={handleAddToCart}
                >
                  Dodaj u korpu <HandPointerSvg />
                </button>

                <div className={styles['product-card__quantity']}>
                  <span>{quantity}</span>

                  <div className={styles['product-card__quantity-buttons']}>
                    <button
                      onClick={increaseQty}
                      disabled={quantity === 10}
                      aria-label="Increase quantity"
                      className={styles['product-card__quantity-btn']}
                      type="button"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 15l6-6 6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={decreaseQty}
                      disabled={quantity === 1}
                      aria-label="Decrease quantity"
                      className={styles['product-card__quantity-btn']}
                      type="button"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
