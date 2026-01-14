'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import clsx from 'clsx';
import styles from './nasumicna-porudzbina.module.scss';
import { useCart } from '@/context/cart/cart-context';
import Image from 'next/image';
import diceRollAnimation from '@/public/lottie/dice 6.json';
import HandPointerSvg from '@/components/svg/hand-pointer-svg';
import { CiRuler } from 'react-icons/ci';
import ClientLink from '@/components/ui/client-link';
import { HiOutlineArrowLongLeft } from 'react-icons/hi2';

type GeneratedPizza = any & {
  selectedVariant?: { size: number; price: number };
  rowQty: number;
};

export default function RandomOrderClient({
  pizzas,
  children,
}: {
  pizzas: any[];
  children: React.ReactNode;
}) {
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [pendingPizzas, setPendingPizzas] = useState<GeneratedPizza[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [resultsPhase, setResultsPhase] = useState<
    'hidden' | 'showing' | 'visible' | 'hiding'
  >('hidden');

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<number>(50);

  const [generatedPizzas, setGeneratedPizzas] = useState<GeneratedPizza[]>([]);

  // Lottie control
  const [dicePlayKey, setDicePlayKey] = useState(0);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [lottieReady, setLottieReady] = useState(false);
  const didIntroRoll = useRef(false);

  // intro handshake
  const introDone = useRef(false);

  // zaključavanje samo za confirm flow (intro ne blokira klik)
  const [isRolling, setIsRolling] = useState(false);
  const [lockUi, setLockUi] = useState(false);

  const { addToCart } = useCart();

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const scrollToEl = (el: HTMLElement, duration = 650) => {
    const startY = window.scrollY;
    const endY = el.getBoundingClientRect().top + window.scrollY - 24;
    const diff = endY - startY;

    let start: number | null = null;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = easeInOutCubic(p);
      window.scrollTo(0, startY + diff * eased);
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const getRandomPizza = () => {
    const index = Math.floor(Math.random() * pizzas.length);
    return pizzas[index];
  };

  const handleConfirm = () => {
    if (!lottieReady) return;
    if (lockUi) return;

    setLockUi(true);
    setIsRolling(true);

    const newPizzas: GeneratedPizza[] = Array.from({ length: quantity }, () => {
      const pizza = getRandomPizza();
      const variant = pizza.variants.find((v: any) => v.size === selectedSize);
      return { ...pizza, selectedVariant: variant, rowQty: 1 };
    });

    setPendingPizzas(newPizzas);

    // fade-out starih rezultata (ako ih ima)
    if (showResults) {
      setResultsPhase('hiding');
      setTimeout(() => {
        setShowResults(false);
        setGeneratedPizzas([]);
        setResultsPhase('hidden');
      }, 220);
    }

    // restart & play animacije
    setDicePlayKey((k) => k + 1);
    requestAnimationFrame(() => {
      lottieRef.current?.goToAndPlay(0, true);
    });
  };

  const handleAddAllToCart = () => {
    generatedPizzas.forEach((pizza) => {
      if (!pizza.selectedVariant) return;

      addToCart({
        productId: pizza.name,
        name: pizza.name,
        image: pizza.image,
        size: pizza.selectedVariant.size,
        price: pizza.selectedVariant.price,
        quantity: pizza.rowQty,
      });
    });

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const currentPath = pathSegments.slice(1).join('/');
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

  // gornji counter (koliko da generiše)
  const increaseQty = () => setQuantity((prev) => Math.min(prev + 1, 10));
  const decreaseQty = () => setQuantity((prev) => Math.max(prev - 1, 1));

  // per-row counter
  const incRowQty = (idx: number) => {
    setGeneratedPizzas((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, rowQty: Math.min((p.rowQty ?? 1) + 1, 10) } : p
      )
    );
  };

  const decRowQty = (idx: number) => {
    setGeneratedPizzas((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, rowQty: Math.max((p.rowQty ?? 1) - 1, 1) } : p
      )
    );
  };

  const totalAll = useMemo(() => {
    return generatedPizzas.reduce((sum, p) => {
      const unit = p.selectedVariant?.price ?? 0;
      const q = p.rowQty ?? 1;
      return sum + unit * q;
    }, 0);
  }, [generatedPizzas]);

  // scroll kad se prikažu rezultati (posle rendera)
  useEffect(() => {
    if (!showResults) return;
    if (!resultsRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (resultsRef.current) scrollToEl(resultsRef.current, 700);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  return (
    <>
      {/* Lottie */}
      <ClientLink
        href="/"
        classes={{
          item: styles['random-order__back'],
        }}
      >
        <HiOutlineArrowLongLeft
          className={styles['random-order__back-icon']}
          aria-hidden="true"
        />
        <span className={styles['random-order__back-text']}>
          Nazad na početnu
        </span>
      </ClientLink>
      <div className={styles['random-order__lottie']}>
        <Lottie
          key={dicePlayKey}
          lottieRef={lottieRef}
          animationData={diceRollAnimation}
          style={{ width: '100%', height: '100%', margin: '0 auto' }}
          loop={false}
          autoplay={false}
          onDOMLoaded={() => {
            setLottieReady(true);

            // intro roll samo jednom (NE blokira UI)
            if (!didIntroRoll.current) {
              didIntroRoll.current = true;
              requestAnimationFrame(() => {
                lottieRef.current?.goToAndPlay(0, true);
              });
            }
          }}
          onComplete={() => {
            // ✅ prvo complete = intro završen → javi preloaderu "page-ready"
            if (!introDone.current) {
              introDone.current = true;
            }

            // otključaj UI posle "confirm" rola (ako je bio)
            if (isRolling) {
              setIsRolling(false);
              setLockUi(false);
            }

            // prikaži pending rezultate tek kad se završi animacija
            if (pendingPizzas.length > 0) {
              setGeneratedPizzas(pendingPizzas);
              setPendingPizzas([]);
              setShowResults(true);
              setResultsPhase('showing');

              setTimeout(() => setResultsPhase('visible'), 240);
            }
          }}
        />
      </div>

      {/* SERVER children: H1 + subtitle su OVDE */}
      {children}

      {/* Counter */}
      <div className={styles['random-order__counter']}>
        <button
          type="button"
          className={styles['random-order__counter-btn']}
          onClick={increaseQty}
          disabled={quantity === 10}
          aria-label="Increase quantity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
          type="button"
          className={styles['random-order__counter-btn']}
          onClick={decreaseQty}
          disabled={quantity === 1}
          aria-label="Decrease quantity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span className={styles['random-order__counter-value']}>
          {quantity}
        </span>
      </div>

      {/* Sizes */}
      <div className={styles['random-order__sizes']}>
        {[24, 32, 50].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setSelectedSize(size)}
            className={clsx(
              styles['random-order__size-btn'],
              selectedSize === size && styles['random-order__size-btn--active']
            )}
          >
            {size} cm
          </button>
        ))}
      </div>

      {/* Confirm */}
      <button
        className={styles['random-order__confirm']}
        onClick={handleConfirm}
        type="button"
        disabled={!lottieReady || lockUi}
      >
        Baci kocku <HandPointerSvg />
      </button>

      {/* Results */}
      {showResults && generatedPizzas.length > 0 && (
        <div
          ref={resultsRef}
          className={clsx(
            styles['random-order__generated'],
            resultsPhase === 'showing' &&
              styles['random-order__generated--showing'],
            resultsPhase === 'hiding' &&
              styles['random-order__generated--hiding']
          )}
        >
          {generatedPizzas.map((pizza, idx) => {
            const unitPrice = pizza.selectedVariant?.price ?? 0;
            const rowQty = pizza.rowQty ?? 1;
            const rowTotal = unitPrice * rowQty;

            return (
              <div
                key={`${pizza.name}-${idx}`}
                className={styles['random-order__row']}
              >
                <div className={styles['random-order__row-media']}>
                  <Image
                    src={pizza?.image || '/images/pp-logo.jpg'}
                    alt={pizza?.name}
                    width={260}
                    height={260}
                    className={styles['random-order__row-image']}
                  />
                </div>

                <div className={styles['random-order__row-info']}>
                  <h4 className={styles['random-order__row-title']}>
                    {pizza.name}
                  </h4>

                  <div className={styles['random-order__row-meta']}>
                    <span className={styles['random-order__row-meta-icon']}>
                      <CiRuler size={22} />
                    </span>
                    <span className={styles['random-order__row-meta-label']}>
                      Veličina
                    </span>
                    <span className={styles['random-order__row-meta-value']}>
                      — {pizza.selectedVariant?.size} cm
                    </span>
                  </div>

                  {pizza?.description && (
                    <p className={styles['random-order__row-desc']}>
                      {pizza.description}
                    </p>
                  )}

                  <div className={styles['random-order__row-unitprice']}>
                    {unitPrice} RSD <span>(cena po komadu)</span>
                  </div>
                </div>

                <div className={styles['random-order__row-right']}>
                  <div className={styles['random-order__row-counter']}>
                    <button
                      type="button"
                      className={styles['random-order__row-counter-btn']}
                      onClick={() => incRowQty(idx)}
                      disabled={rowQty === 10}
                      aria-label="Increase row quantity"
                    >
                      <svg
                        width="16"
                        height="16"
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
                      type="button"
                      className={styles['random-order__row-counter-btn']}
                      onClick={() => decRowQty(idx)}
                      disabled={rowQty === 1}
                      aria-label="Decrease row quantity"
                    >
                      <svg
                        width="16"
                        height="16"
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

                    <span className={styles['random-order__row-counter-value']}>
                      {rowQty}
                    </span>
                  </div>

                  <div className={styles['random-order__row-total']}>
                    {rowTotal} RSD
                  </div>
                </div>
              </div>
            );
          })}

          <div className={styles['random-order__summary']}>
            <span>Ukupno:</span>
            <strong>{totalAll} RSD</strong>
          </div>

          <button
            className={styles['random-order__add-all']}
            onClick={handleAddAllToCart}
            type="button"
          >
            Dodaj sve u korpu <HandPointerSvg />
          </button>
        </div>
      )}
    </>
  );
}
