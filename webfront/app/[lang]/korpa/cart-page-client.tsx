'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CiRuler } from 'react-icons/ci';
import { HiMiniXMark, HiOutlineArrowLongLeft } from 'react-icons/hi2';
import {
  FiUser,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiMapPin,
} from 'react-icons/fi';

import styles from './korpa.module.scss';
import { useCart } from '@/context/cart/cart-context';
import SidebarCartFormField from '@/components/ui/sidebar-cart-preview/sidebar-cart-form-field';
import HandPointerSvg from '@/components/svg/hand-pointer-svg';
import ClientLink from '@/components/ui/client-link';
import clsx from 'clsx';
import { DeliveryReason } from '@/context/cart/cart-provider';
import { Dictionary } from '../dictionaries';

import { createOrderAction } from '@/app/actions/create-order';
import { useOrderTracking } from '@/context/order/order-tracking-context';
import { PublicRestaurantHoursResponse } from '@/lib/restaurant';

type Props = {
  title: string;
  subtitle?: string;
  t: CartPageDict;
  deliveryT: Dictionary['cart']['delivery'];
  hours?: PublicRestaurantHoursResponse | null;
};

type CartPageDict = {
  back: string;
  itemsInCart_one: string; // "{count} ..."
  itemsInCart_other: string; // "{count} ..."

  sizeLabel: string;
  unitPrice: string;
  unitPriceSuffix: string;

  decreaseQty: string;
  increaseQty: string;
  removeFromCart: string;

  emptyCart: string;

  totalLabel: string;

  savedCustomersTitle: string;
  unknownUser: string;
  noPhone: string;

  form: {
    fullName: string;
    phone: string;
    email: string;
    note: string;
    delivery: string;
    pickup: string;
    address: string;
    deliveryOk: string;
    deliveryNotOkFallback: string;
    cashOnly: string;
    submit: string;
    consent: string;
    restaurantClosed: string;
  };
};

type SavedCustomer = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  orderType: 'delivery' | 'pickup';
  note?: string;
};

const STORAGE_KEY = 'pp_saved_customers';

function formatCount(template: string, count: number) {
  return template.replace('{count}', String(count));
}

export default function CartPageClient({
  title,
  subtitle,
  t,
  deliveryT,
  hours,
}: Props) {
  const {
    items = [],
    totalPrice,
    updateItemQuantity,
    removeFromCart,
    delivery,
  } = useCart();

  const isRestaurantClosed =
    !!hours &&
    (hours.effective?.isClosed === true || hours.isOpenNow === false);
  const { startTracking } = useOrderTracking();

  const [mounted, setMounted] = useState(false);

  const hasItems = items.length > 0;

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const isDelivery = orderType === 'delivery';

  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);

  // ✅ submit/loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ✅ mount guard + load saved customers
  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as SavedCustomer[] | null;
      if (!Array.isArray(parsed)) return;

      const uniqueByEmail = new Map<string, SavedCustomer>();
      for (const c of parsed) {
        if (!c?.email) continue;
        uniqueByEmail.set(c.email.trim().toLowerCase(), c);
      }

      setSavedCustomers(Array.from(uniqueByEmail.values()));
    } catch (err) {
      console.error('Failed to load saved customers', err);
    }
  }, []);

  // ✅ if user selects delivery but delivery is not allowed -> force pickup
  useEffect(() => {
    if (orderType === 'delivery' && !delivery.allowed) {
      setOrderType('pickup');
      setAddress('');
    }
  }, [orderType, delivery.allowed]);

  const totalItems = useMemo(
    () => items.reduce((acc: number, it: any) => acc + (it.quantity ?? 1), 0),
    [items],
  );

  const itemsMetaText = useMemo(() => {
    const key = totalItems === 1 ? 'itemsInCart_one' : 'itemsInCart_other';
    return formatCount(t[key], totalItems);
  }, [t, totalItems]);

  // ✅ cart operations (variantId)
  const handleIncrease = (item: any) => {
    if (isSubmitting) return;
    const current = item.quantity ?? 1;
    const next = Math.min(current + 1, 10);
    if (!item?.variantId) return;
    updateItemQuantity(item.variantId, next);
  };

  const handleDecrease = (item: any) => {
    if (isSubmitting) return;
    const current = item.quantity ?? 1;
    const next = Math.max(current - 1, 1);
    if (!item?.variantId) return;
    updateItemQuantity(item.variantId, next);
  };

  const handleRemove = (item: any) => {
    if (isSubmitting) return;
    if (!item?.variantId) return;
    removeFromCart(item.variantId);
  };

  // last-wins update for customer by email
  const saveCustomerToLocalStorage = (customer: SavedCustomer) => {
    if (typeof window === 'undefined') return;

    const emailKey = customer.email?.trim().toLowerCase();
    if (!emailKey) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const existing: SavedCustomer[] = raw ? JSON.parse(raw) : [];

      const uniqueByEmail = new Map<string, SavedCustomer>();
      for (const c of existing) {
        if (!c?.email) continue;
        uniqueByEmail.set(c.email.trim().toLowerCase(), c);
      }

      uniqueByEmail.set(emailKey, customer);

      const uniqueList = Array.from(uniqueByEmail.values());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueList));
      setSavedCustomers(uniqueList);
    } catch (err) {
      console.error('Failed to save customer', err);
    }
  };

  const handleSelectSavedCustomer = (customer: SavedCustomer) => {
    setFullName(customer.fullName || '');
    setEmail(customer.email || '');
    setPhone(customer.phone || '');

    const nextOrderType =
      customer.orderType === 'delivery' && !delivery.allowed
        ? 'pickup'
        : customer.orderType || 'pickup';

    setOrderType(nextOrderType);
    setAddress(nextOrderType === 'delivery' ? customer.address || '' : '');
    setNote(customer.note || '');

    setSubmitError(null);
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setOrderType('pickup');
    setAddress('');
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!items.length || isSubmitting) return;
    if (isRestaurantClosed) return;

    // ✅ native HTML validation gate (shows browser tooltip messages)
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (orderType === 'delivery' && !delivery.allowed) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      note: note.trim(),
      type: orderType,
      addressText: orderType === 'delivery' ? address.trim() : null,
      items: items.map((x: any) => ({
        variantId: x.variantId,
        quantity: x.quantity ?? 1,
      })),
    };

    try {
      const res = await createOrderAction(payload);

      // expected: { publicCode, token, status, total }
      if (!res?.publicCode || !res?.token) {
        throw new Error('Order created but missing publicCode/token.');
      }

      // ✅ save customer profile (only if email exists)
      if (payload.email) {
        saveCustomerToLocalStorage({
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          address: payload.addressText ?? '',
          orderType,
          note: payload.note ?? '',
        });
      }

      // ✅ start global tracking + open modal
      startTracking({ publicCode: res.publicCode, token: res.token });

      resetForm();
    } catch (err: any) {
      console.error('createOrderAction failed', err);
      setSubmitError(err?.message ?? 'Failed to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  type DeliveryReasonKey = Exclude<DeliveryReason, null>;

  const deliveryReasonText = delivery.reason
    ? deliveryT[delivery.reason as keyof typeof deliveryT]
    : t.form.deliveryNotOkFallback;

  if (!mounted) return null;

  return (
    <div className={styles['cart-page']}>
      <div className={styles['cart-page__container']}>
        <ClientLink
          href="/"
          classes={{
            item: styles['cart-page__back'],
          }}
        >
          <HiOutlineArrowLongLeft
            className={styles['cart-page__back-icon']}
            aria-hidden="true"
          />
          <span className={styles['cart-page__back-text']}>{t.back}</span>
        </ClientLink>

        <header className={styles['cart-page__header']}>
          <h1 className={styles['cart-page__title']}>{title}</h1>
          {subtitle && (
            <p className={styles['cart-page__subtitle']}>{subtitle}</p>
          )}
        </header>

        <div className={styles['cart-page__body']}>
          {/* LEFT: ITEMS */}
          <div className={styles['cart-page__main']}>
            <section className={styles['cart-page__section']}>
              <div className={styles['cart-page__section-head']}>
                <div className={styles['cart-page__section-meta']}>
                  {itemsMetaText}
                </div>
              </div>

              {hasItems ? (
                <div className={styles['cart-page__items']}>
                  {items.map((item: any, idx: number) => {
                    const qty = item.quantity ?? 1;
                    const unitPrice = item.price ?? 0;
                    const lineTotal = unitPrice * qty;

                    const imageSrc = item.image
                      ? `/media${item.image}`
                      : '/images/pp-logo.jpg';

                    return (
                      <div
                        key={
                          item?.variantId ??
                          `${item.productId}-${item.size}-${idx}`
                        }
                        className={styles['cart-page__item']}
                      >
                        <div className={styles['cart-page__item-main']}>
                          <Image
                            src={imageSrc}
                            alt={item.name}
                            width={1000}
                            height={1000}
                            className={styles['cart-page__item-image']}
                          />

                          <div className={styles['cart-page__item-text']}>
                            <div className={styles['cart-page__item-name']}>
                              {item.name}
                            </div>

                            {item?.size && (
                              <div className={styles['cart-page__item-meta']}>
                                <span
                                  className={styles['cart-page__meta-icon']}
                                >
                                  <CiRuler size={20} />
                                </span>
                                <span
                                  className={styles['cart-page__meta-label']}
                                >
                                  {t.sizeLabel}
                                </span>
                                <span
                                  className={styles['cart-page__meta-value']}
                                >
                                  — {item?.size} cm
                                </span>
                              </div>
                            )}

                            {item?.description && (
                              <p className={styles['cart-page__item-desc']}>
                                {item.description}
                              </p>
                            )}

                            <div
                              className={styles['cart-page__item-unitprice']}
                            >
                              {unitPrice} {t.unitPrice}{' '}
                              <span>{t.unitPriceSuffix}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles['cart-page__item-right']}>
                          <div className={styles['cart-page__item-counter']}>
                            <button
                              type="button"
                              className={styles['cart-page__item-counter-btn']}
                              onClick={() => handleDecrease(item)}
                              disabled={qty === 1 || isSubmitting}
                              aria-label={t.decreaseQty}
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

                            <span
                              className={
                                styles['cart-page__item-counter-value']
                              }
                            >
                              {qty}
                            </span>

                            <button
                              type="button"
                              className={styles['cart-page__item-counter-btn']}
                              onClick={() => handleIncrease(item)}
                              disabled={qty === 10 || isSubmitting}
                              aria-label={t.increaseQty}
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
                          </div>

                          <div className={styles['cart-page__item-price']}>
                            {lineTotal} {t.unitPrice}
                          </div>

                          <button
                            type="button"
                            className={styles['cart-page__item-remove']}
                            onClick={() => handleRemove(item)}
                            aria-label={t.removeFromCart}
                            disabled={isSubmitting}
                          >
                            <HiMiniXMark size={26} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles['cart-page__empty']}>{t.emptyCart}</div>
              )}
            </section>
          </div>

          {/* RIGHT: STICKY */}
          <aside className={styles['cart-page__aside']}>
            <div className={styles['cart-page__sticky']}>
              <div className={styles['cart-page__stickyInner']}>
                {/* TOTAL */}
                <section className={styles['cart-page__section']}>
                  <div className={styles['cart-page__total']}>
                    <span className={styles['cart-page__total-label']}>
                      {t.totalLabel}
                    </span>
                    <span className={styles['cart-page__total-value']}>
                      {totalPrice} {t.unitPrice}
                    </span>
                  </div>
                </section>

                {/* SAVED */}
                {savedCustomers.length > 0 && (
                  <section className={styles['cart-page__section']}>
                    <div className={styles['cart-page__saved']}>
                      <div className={styles['cart-page__saved-title']}>
                        {t.savedCustomersTitle}
                      </div>
                      <ul className={styles['cart-page__saved-list']}>
                        {savedCustomers.map((c, idx) => (
                          <li
                            key={`${c.email}-${idx}`}
                            className={styles['cart-page__saved-list-item']}
                          >
                            <button
                              type="button"
                              className={styles['cart-page__saved-item']}
                              onClick={() => handleSelectSavedCustomer(c)}
                              disabled={isSubmitting}
                            >
                              <span
                                className={styles['cart-page__saved-line-main']}
                              >
                                {c.fullName || t.unknownUser} • {c.email}
                              </span>
                              <span
                                className={styles['cart-page__saved-line-sub']}
                              >
                                {c.address && `${c.address} • `}
                                {c.phone || t.noPhone}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {/* FORM */}
                <section className={styles['cart-page__section']}>
                  <form
                    className={styles['cart-page__form']}
                    onSubmit={handleSubmit}
                  >
                    <div className={styles['cart-page__form-row']}>
                      <SidebarCartFormField
                        type="text"
                        placeholder={t.form.fullName}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        minLength={3}
                        leftIcon={<FiUser size={16} />}
                        disabled={isSubmitting}
                      />

                      <SidebarCartFormField
                        type="tel"
                        placeholder={t.form.phone}
                        value={phone}
                        onChange={(e) => {
                          const raw = (e.target.value ?? '').toString();
                          setPhone(raw.replace(/\D/g, ''));
                        }}
                        required
                        pattern="\d+"
                        leftIcon={<FiPhone size={16} />}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className={styles['cart-page__form-row']}>
                      <SidebarCartFormField
                        type="email"
                        placeholder={t.form.email}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={isDelivery}
                        leftIcon={<FiMail size={16} />}
                        disabled={isSubmitting}
                      />

                      <SidebarCartFormField
                        as="textarea"
                        placeholder={t.form.note}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        leftIcon={<FiMessageSquare size={16} />}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className={styles['cart-page__form-row']}>
                      <div className={styles['cart-page__form-radios']}>
                        <label
                          className={clsx(
                            styles['cart-page__form-radio'],
                            !delivery.allowed &&
                              styles['cart-page__form-radio--disabled'],
                          )}
                        >
                          <input
                            type="radio"
                            name="orderType"
                            value="delivery"
                            checked={orderType === 'delivery'}
                            onChange={() => setOrderType('delivery')}
                            disabled={!delivery.allowed || isSubmitting}
                            className={styles['cart-page__form-radio-input']}
                          />
                          <span
                            className={styles['cart-page__form-radio-box']}
                          />
                          <span
                            className={styles['cart-page__form-radio-label']}
                          >
                            {t.form.delivery}
                          </span>
                        </label>

                        <label className={styles['cart-page__form-radio']}>
                          <input
                            type="radio"
                            name="orderType"
                            value="pickup"
                            checked={orderType === 'pickup'}
                            onChange={() => setOrderType('pickup')}
                            disabled={isSubmitting}
                            className={styles['cart-page__form-radio-input']}
                          />
                          <span
                            className={styles['cart-page__form-radio-box']}
                          />
                          <span
                            className={styles['cart-page__form-radio-label']}
                          >
                            {t.form.pickup}
                          </span>
                        </label>
                      </div>
                      {!isRestaurantClosed && (
                        <div
                          className={clsx(
                            styles['cart-page__delivery-message'],
                            !delivery.allowed &&
                              styles['cart-page__delivery-message--error'],
                          )}
                          role="status"
                          aria-live="polite"
                        >
                          {delivery.allowed ? null : deliveryReasonText}
                        </div>
                      )}
                      {!isRestaurantClosed && (
                        <div
                          className={styles['cart-page__cash-message']}
                          role="note"
                        >
                          {t.form.cashOnly}
                        </div>
                      )}
                    </div>
                    {isRestaurantClosed && (
                      <div
                        className={clsx(
                          styles['cart-page__delivery-message'],
                          styles['cart-page__delivery-message--error'],
                        )}
                        role="alert"
                      >
                        {t.form.restaurantClosed}
                      </div>
                    )}
                    {orderType === 'delivery' && (
                      <div className={styles['cart-page__form-row']}>
                        <SidebarCartFormField
                          type="text"
                          placeholder={t.form.address}
                          value={address}
                          leftIcon={<FiMapPin />}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    {submitError ? (
                      <div
                        className={styles['cart-page__submit-error']}
                        role="alert"
                      >
                        {submitError}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      className={styles['cart-page__submit']}
                      disabled={
                        !hasItems ||
                        isSubmitting ||
                        isRestaurantClosed ||
                        (isDelivery && !delivery.allowed)
                      }
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-label="Loading"
                          role="img"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.25"
                          />
                          <path
                            d="M21 12a9 9 0 0 0-9-9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              from="0 12 12"
                              to="360 12 12"
                              dur="0.8s"
                              repeatCount="indefinite"
                            />
                          </path>
                        </svg>
                      ) : (
                        <>
                          {t.form.submit}
                          <HandPointerSvg />
                        </>
                      )}
                    </button>

                    <p className={styles['cart-page__form-note']}>
                      {t.form.consent}
                    </p>
                  </form>
                </section>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
