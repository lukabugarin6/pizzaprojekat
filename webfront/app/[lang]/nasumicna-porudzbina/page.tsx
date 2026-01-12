'use client';

import { useState } from 'react';
import Lottie from 'lottie-react';
import { pizzas } from '@/data';
import clsx from 'clsx';
import styles from './nasumicna-porudzbina.module.scss';
import { useCart } from '@/context/cart/cart-context';
import Image from 'next/image';
import diceRollAnimation from '@/public/lottie/dice 6.json';

export default function NasumicnaPorudzbinaPage() {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number>(24);
  const [generatedPizzas, setGeneratedPizzas] = useState<any[]>([]);
  const { addToCart } = useCart();

  const getRandomPizza = () => {
    const index = Math.floor(Math.random() * pizzas.length);
    return pizzas[index];
  };

  const handleConfirm = () => {
    const newPizzas = Array.from({ length: quantity }, () => {
      const pizza = getRandomPizza();
      // dodaj izabranu veličinu
      const variant = pizza.variants.find((v) => v.size === selectedSize);
      return { ...pizza, selectedVariant: variant };
    });
    setGeneratedPizzas(newPizzas);
  };

  const handleAddAllToCart = () => {
    generatedPizzas.forEach((pizza) => {
      if (pizza.selectedVariant) {
        addToCart({
          productId: pizza.name,
          name: pizza.name,
          image: pizza.image,
          size: pizza.selectedVariant.size,
          price: pizza.selectedVariant.price,
          quantity: 1,
        });
      }
    });

    // dispatch ka korpi kao u sidebaru
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const currentPath = pathSegments.slice(1).join('/'); // uklanja lang
    const targetPath = 'korpa';

    if (currentPath === targetPath) {
      window.dispatchEvent(
        new CustomEvent('start-route-change', {
          detail: { href: window.location.pathname, forceOpen: true },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('start-route-change', {
          detail: { href: `/${pathSegments[0]}/korpa` },
        })
      );
    }
  };

  const increaseQty = () => setQuantity((prev) => Math.min(prev + 1, 10));
  const decreaseQty = () => setQuantity((prev) => Math.max(prev - 1, 1));

  return (
    <main className={styles.wrapper}>
      {/* Lottie animacija */}
      <div className={styles.lottieWrapper}>
        <Lottie
          animationData={diceRollAnimation}
          style={{ width: 300, height: 300, margin: '0 auto' }}
          loop={false}
        />
      </div>

      <h1 className={styles.title}>Nasumična porudžbina</h1>
      <p className={styles.subtitle}>
        Otkrijte iznenađenje! Kliknite potvrdi i saznajte koju picu ćete dobiti.
      </p>

      {/* Counter */}
      <div className={styles.counterWrapper}>
        <button onClick={decreaseQty}>-</button>
        <span>{quantity}</span>
        <button onClick={increaseQty}>+</button>
      </div>

      {/* Select varijante */}
      <div className={styles.sizeSelectWrapper}>
        {[24, 32, 50].map((size) => (
          <button
            key={size}
            onClick={() => setSelectedSize(size)}
            className={clsx(
              styles.sizeBtn,
              selectedSize === size && styles.sizeBtnActive
            )}
          >
            {size} cm
          </button>
        ))}
      </div>

      {/* Dugme potvrdi */}
      <button className={styles.confirmBtn} onClick={handleConfirm}>
        Potvrdi
      </button>

      {/* Prikaz generisanih pica */}
      {generatedPizzas.length > 0 && (
        <div className={styles.generatedWrapper}>
          {generatedPizzas.map((pizza, idx) => (
            <div key={idx} className={styles.generatedItem}>
              <Image
                src={pizza?.image || '/images/pp-logo.jpg'}
                alt={pizza?.name}
                width={1000}
                height={1000}
                sizes="100vw"
                style={{
                  width: '200px',
                  height: 'auto',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  objectPosition: 'bottom',
                }}
              />
              <h4>{pizza.name}</h4>
              <p>Veličina: {pizza.selectedVariant?.size} cm</p>
              <p>Cena: {pizza.selectedVariant?.price} RSD</p>
            </div>
          ))}

          <button className={styles.addAllBtn} onClick={handleAddAllToCart}>
            Dodaj sve u korpu
          </button>
        </div>
      )}
    </main>
  );
}
