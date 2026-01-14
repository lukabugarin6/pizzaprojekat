'use client';

import { useRef, useState } from 'react';
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
  const { addToCart, totalItems } = useCart();

  const imageRef = useRef<HTMLImageElement | null>(null);
  const { flyToCart } = useFlyToCart();

  const { ref, isVisible } = useFadeInOnView({ threshold: 0.25 });

  const variants = item?.variants || [];
  const hasMultipleVariants = variants.length > 1;

  const [selectedSize, setSelectedSize] = useState<number | null>(() => {
    if (!variants?.length) return null;
    return Math.max(...variants.map((v: any) => Number(v.size) || 0));
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [showOverlay, setShowOverlay] = useState(false);

  const selectedVariant = variants.find((v: any) => v.size === selectedSize);

  const totalPrice = selectedVariant?.price
    ? selectedVariant.price * quantity
    : 0;

  const increaseQty = () => setQuantity((prev) => Math.min(prev + 1, 10));
  const decreaseQty = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    flyToCart(imageRef.current);

    addToCart({
      productId: item.id,
      name: item.name,
      image: item.image,
      size: selectedVariant.size,
      price: selectedVariant.price,
      quantity,
    });

    // čuvamo koliko je upravo dodato
    const justAdded = quantity;

    // pokaži overlay sa tim brojem
    setShowOverlay(true);

    // hide overlay nakon 1.5s
    setTimeout(() => setShowOverlay(false), 2000);

    // reset quantity i veličinu
    setQuantity(1);
    // setSelectedSize(variants[0]?.size ?? null);

    // koristimo justAdded za prikaz u overlay-u
    setOverlayQuantity(justAdded);
  };

  return (
    <div
      ref={ref}
      className={clsx(
        styles['product-card'],
        isVisible && styles['product-card--animated'],
        isVisible && styles['product-card--fade-in'],
        smaller && styles['product-card--smaller']
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
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '1 / 1',
              objectFit: 'cover',
              objectPosition: 'bottom',
            }}
          />
        </div>

        <div className={styles['product-card__content']}>
          <h4>{item?.name}</h4>
          {item?.description && <p>{item?.description}</p>}

          {hasMultipleVariants && (
            <>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        styles['product-card__size-btn--active']
                    )}
                  >
                    {variant.size} cm
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={styles['product-card__price']}>{totalPrice} RSD</div>

          {selectedVariant && (
            <div className={styles['product-card__footer']}>
              {/* overlay kada se doda u korpu */}
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
