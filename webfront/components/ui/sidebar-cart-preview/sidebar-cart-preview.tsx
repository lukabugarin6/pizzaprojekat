'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Image from 'next/image';
import { CiRuler } from 'react-icons/ci';
import { HiMiniXMark } from 'react-icons/hi2';
import {
  FiUser,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiMapPin,
} from 'react-icons/fi';

import styles from './sidebar-cart-preview.module.scss';
import { useCart } from '@/context/cart/cart-context';
import SidebarCartFormField from './sidebar-cart-form-field';
import HandPointerSvg from '@/components/svg/hand-pointer-svg';
import { Dictionary } from '@/app/[lang]/dictionaries';
import { DeliveryReason } from '@/context/cart/cart-provider';

type SidebarCartPreviewProps = {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  cartT: Dictionary['cart'];
  cartPageT: Dictionary['cartPage'];
};

type SavedCustomer = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  orderType: 'delivery' | 'pickup';
  note?: string; // 👈 sada i napomena ide u profil
};

const STORAGE_KEY = 'pp_saved_customers';

export default function SidebarCartPreview({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  cartT,
  cartPageT,
}: SidebarCartPreviewProps) {
  const {
    items = [],
    totalPrice,
    updateItemQuantity,
    removeFromCart,
    delivery,
  } = useCart();

  const [mounted, setMounted] = useState(false);

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup'); // default pickup
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  // sačuvani kupci (jedinstveni po emailu)
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);

  // mount guard + učitavanje sačuvanih kupaca
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
        if (!c || !c.email) continue;
        const key = c.email.trim().toLowerCase();
        if (!uniqueByEmail.has(key)) {
          uniqueByEmail.set(key, c);
        }
      }

      setSavedCustomers(Array.from(uniqueByEmail.values()));
    } catch (err) {
      console.error('Failed to load saved customers', err);
    }
  }, []);

  useEffect(() => {
    if (orderType === 'delivery' && !delivery.allowed) {
      setOrderType('pickup');
      setAddress(''); // opcionalno: očisti adresu kad nije dostava
    }
  }, [orderType, delivery.allowed]);

  if (!mounted) return null;

  const hasItems = items.length > 0;

  const handleIncrease = (item: any) => {
    const current = item.quantity ?? 1;
    const next = Math.min(current + 1, 10);
    updateItemQuantity(item.productId, item.size, next);
  };

  const handleDecrease = (item: any) => {
    const current = item.quantity ?? 1;
    const next = Math.max(current - 1, 1);
    updateItemQuantity(item.productId, item.size, next);
  };

  const handleRemove = (item: any) => {
    removeFromCart(item.productId, item.size);
  };

  // LAST-WINS update za kupca po email-u
  const saveCustomerToLocalStorage = (customer: SavedCustomer) => {
    if (typeof window === 'undefined') return;

    const emailKey = customer.email?.trim().toLowerCase();
    if (!emailKey) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const existing: SavedCustomer[] = raw ? JSON.parse(raw) : [];

      const uniqueByEmail = new Map<string, SavedCustomer>();

      // 1) upiši sve postojeće
      for (const c of existing) {
        if (!c || !c.email) continue;
        const key = c.email.trim().toLowerCase();
        uniqueByEmail.set(key, c);
      }

      // 2) upiši NOVOG kupca – pregazi starog za taj email
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
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setOrderType('pickup');
    setAddress('');
    setNote('');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!items.length) return;
    if (orderType === 'delivery' && !delivery.allowed) return;

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const trimmedNote = note.trim();

    if (trimmedEmail) {
      const customer: SavedCustomer = {
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        orderType,
        note: trimmedNote, // 👈 snimamo i napomenu
      };

      // last-wins po emailu
      saveCustomerToLocalStorage(customer);
    }

    console.log('ORDER PAYLOAD', {
      fullName: trimmedFullName,
      email: trimmedEmail,
      phone: trimmedPhone,
      orderType,
      address: orderType === 'delivery' ? trimmedAddress : '',
      note: trimmedNote,
      items,
      totalPrice,
    });

    // kasnije pomeri reset u onSuccess backend poziva
    resetForm();
  };

  type DeliveryReasonKey = Exclude<DeliveryReason, null>;

  const deliveryReasonText = delivery.reason
    ? cartT.delivery[delivery.reason as keyof typeof cartT.delivery]
    : cartPageT.form.deliveryNotOkFallback;

  return createPortal(
    <div
      className={styles['sidebar-cart']}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={clsx(
          styles['sidebar-cart__panel'],
          isOpen && styles['sidebar-cart__panel--open'],
          !hasItems && styles['sidebar-cart__panel--empty'],
        )}
      >
        <div className={styles['sidebar-cart__inner']}>
          {hasItems && (
            <header className={styles['sidebar-cart__header']}>
              <div className={styles['sidebar-cart__header-main']}>
                <h3 className={styles['sidebar-cart__header-title']}>
                  {cartT.title}
                </h3>
              </div>
            </header>
          )}

          <div className={styles['sidebar-cart__body']}>
            {hasItems ? (
              <div className={styles['sidebar-cart__items']}>
                {items.map((item: any) => {
                  const qty = item.quantity ?? 1;
                  const lineTotal = (item.price ?? 0) * qty;
                  const imageSrc =
                    item.image && item.image.trim() !== ''
                      ? item.image
                      : '/images/pp-logo.jpg';

                  return (
                    <div
                      key={`${item.productId}-${item.size}`}
                      className={styles['sidebar-cart__item']}
                    >
                      <div className={styles['sidebar-cart__item-main']}>
                        <Image
                          src={imageSrc}
                          alt={item.name}
                          width={1000}
                          height={1000}
                          className={styles['sidebar-cart__item-image']}
                        />
                        <div className={styles['sidebar-cart__item-text']}>
                          <div className={styles['sidebar-cart__item-name']}>
                            {item.name}
                          </div>
                          {item?.size && (
                            <div className={styles['sidebar-cart__item-meta']}>
                              <span
                                className={styles['sidebar-cart__meta-icon']}
                              >
                                <CiRuler size={20} />
                              </span>
                              <span
                                className={styles['sidebar-cart__meta-label']}
                              >
                                {cartPageT.sizeLabel}
                              </span>
                              <span
                                className={styles['sidebar-cart__meta-value']}
                              >
                                — {item?.size} cm
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles['sidebar-cart__item-right']}>
                        <div className={styles['sidebar-cart__item-counter']}>
                          <button
                            type="button"
                            className={styles['sidebar-cart__item-counter-btn']}
                            onClick={() => handleDecrease(item)}
                            disabled={qty === 1}
                            aria-label={cartPageT.decreaseQty}
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
                              styles['sidebar-cart__item-counter-value']
                            }
                          >
                            {qty}
                          </span>

                          <button
                            type="button"
                            className={styles['sidebar-cart__item-counter-btn']}
                            onClick={() => handleIncrease(item)}
                            disabled={qty === 10}
                            aria-label={cartPageT.increaseQty}
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

                        <div className={styles['sidebar-cart__item-price']}>
                          {lineTotal} RSD
                        </div>

                        <button
                          type="button"
                          className={styles['sidebar-cart__item-remove']}
                          onClick={() => handleRemove(item)}
                          aria-label={cartPageT.removeFromCart}
                        >
                          <HiMiniXMark size={26} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles['sidebar-cart__empty']}>
                {cartPageT.emptyCart}
              </div>
            )}
          </div>

          {hasItems && (
            <footer className={styles['sidebar-cart__footer']}>
              <div className={styles['sidebar-cart__footer-row']}>
                <span className={styles['sidebar-cart__footer-label']}>
                  {cartPageT.totalLabel}
                </span>

                <span className={styles['sidebar-cart__footer-value']}>
                  {totalPrice} RSD
                </span>
              </div>
              {savedCustomers.length > 0 && (
                <div className={styles['sidebar-cart__saved']}>
                  <div className={styles['sidebar-cart__saved-title']}>
                    {cartPageT.savedCustomersTitle}
                  </div>
                  <ul className={styles['sidebar-cart__saved-list']}>
                    {savedCustomers.map((c, idx) => (
                      <li
                        key={`${c.email}-${idx}`}
                        className={styles['sidebar-cart__saved-list-item']}
                      >
                        <button
                          type="button"
                          className={styles['sidebar-cart__saved-item']}
                          onClick={() => handleSelectSavedCustomer(c)}
                        >
                          <span
                            className={styles['sidebar-cart__saved-line-main']}
                          >
                            {c.fullName || cartPageT.unknownUser}
                            {c.phone || cartPageT.noPhone}
                          </span>
                          <span
                            className={styles['sidebar-cart__saved-line-sub']}
                          >
                            {c.address && `${c.address} • `}
                            {c.phone || cartPageT.noPhone}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form
                className={styles['sidebar-cart__form']}
                onSubmit={handleSubmit}
              >
                {/* red 1: ime + telefon */}
                <div
                  className={clsx(
                    styles['sidebar-cart__form-row'],
                    styles['sidebar-cart__form-row--inputs'],
                  )}
                >
                  <SidebarCartFormField
                    type="text"
                    placeholder={cartPageT.form.fullName}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    leftIcon={<FiUser size={16} />}
                  />

                  <SidebarCartFormField
                    type="tel"
                    placeholder={cartPageT.form.phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    leftIcon={<FiPhone size={16} />}
                  />
                </div>

                {/* red 2: email + napomena */}
                <div
                  className={clsx(
                    styles['sidebar-cart__form-row'],
                    styles['sidebar-cart__form-row--inputs'],
                  )}
                >
                  <SidebarCartFormField
                    type="email"
                    placeholder={cartPageT.form.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<FiMail size={16} />}
                  />

                  <SidebarCartFormField
                    as="textarea"
                    placeholder={cartPageT.form.note}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    leftIcon={<FiMessageSquare size={16} />}
                  />
                </div>

                {/* red 3: radio dugmad */}
                <div
                  className={clsx(
                    styles['sidebar-cart__form-row'],
                    styles['radioBtnWrapper'],
                  )}
                >
                  <div className={styles['sidebar-cart__form-radios']}>
                    <label
                      className={clsx(
                        styles['sidebar-cart__form-radio'],
                        !delivery.allowed &&
                          styles['sidebar-cart__form-radio--disabled'],
                      )}
                    >
                      <input
                        type="radio"
                        name="orderType"
                        value="delivery"
                        checked={orderType === 'delivery'}
                        onChange={() => setOrderType('delivery')}
                        disabled={!delivery.allowed}
                        className={styles['sidebar-cart__form-radio-input']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-box']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-label']}
                      >
                        {cartPageT.form.delivery}
                      </span>
                    </label>

                    <label className={styles['sidebar-cart__form-radio']}>
                      <input
                        type="radio"
                        name="orderType"
                        value="pickup"
                        checked={orderType === 'pickup'}
                        onChange={() => setOrderType('pickup')}
                        className={styles['sidebar-cart__form-radio-input']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-box']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-label']}
                      >
                        {cartPageT.form.pickup}
                      </span>
                    </label>
                  </div>

                  {/* poruka UVEK ispod, razmak 10px */}
                  <div
                    className={clsx(
                      styles['sidebar-cart__delivery-message'],
                      !delivery.allowed &&
                        styles['sidebar-cart__delivery-message--error'],
                    )}
                    role="status"
                    aria-live="polite"
                  >
                    {delivery.allowed ? null : deliveryReasonText}
                  </div>
                  <div
                    className={styles['sidebar-cart__cash-message']}
                    role="note"
                  >
                    {cartPageT.form.cashOnly}
                  </div>
                </div>

                {/* red 4: adresa */}
                {orderType === 'delivery' && (
                  <div className={styles['sidebar-cart__form-row']}>
                    <SidebarCartFormField
                      type="text"
                      placeholder={cartPageT.form.address}
                      value={address}
                      leftIcon={<FiMapPin />}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className={styles['sidebar-cart__submit']}
                  disabled={!hasItems}
                >
                  {cartPageT.form.submit}
                  <HandPointerSvg />
                </button>

                <p className={styles['sidebar-cart__form-note']}>
                  {cartPageT.form.consent}
                </p>
              </form>
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
