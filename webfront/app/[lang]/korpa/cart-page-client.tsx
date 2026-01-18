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

type Props = {
  title: string;
  subtitle?: string;
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

export default function CartPageClient({ title, subtitle }: Props) {
  const {
    items = [],
    totalPrice,
    updateItemQuantity,
    removeFromCart,
    delivery,
  } = useCart();

  const hasItems = items.length > 0;

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);

  useEffect(() => {
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

  // ✅ ako user prebaci na dostavu, a dostava nije dozvoljena – vrati na pickup
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

  const saveCustomerToLocalStorage = (customer: SavedCustomer) => {
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

    // ✅ uzmi u obzir delivery.allowed
    const nextOrderType =
      customer.orderType === 'delivery' && !delivery.allowed
        ? 'pickup'
        : customer.orderType || 'pickup';

    setOrderType(nextOrderType);

    // ✅ adresa samo ako je dostava
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

    // ✅ hard-block ako je dostava “na silu”
    if (orderType === 'delivery' && !delivery.allowed) return;

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const trimmedNote = note.trim();

    if (trimmedEmail) {
      saveCustomerToLocalStorage({
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        orderType,
        note: trimmedNote,
      });
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

    resetForm();
  };

  const itemLabel = totalItems === 1 ? 'proizvod' : 'proizvoda';

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
          <span className={styles['cart-page__back-text']}>
            Nazad na početnu
          </span>
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
                  {totalItems} {itemLabel} u korpi
                </div>
              </div>

              {hasItems ? (
                <div className={styles['cart-page__items']}>
                  {items.map((item: any) => {
                    const qty = item.quantity ?? 1;
                    const unitPrice = item.price ?? 0;
                    const lineTotal = unitPrice * qty;

                    const imageSrc =
                      item.image && item.image.trim() !== ''
                        ? item.image
                        : '/images/pp-logo.jpg';

                    return (
                      <div
                        key={`${item.productId}-${item.size}`}
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

                            <div className={styles['cart-page__item-meta']}>
                              <span className={styles['cart-page__meta-icon']}>
                                <CiRuler size={20} />
                              </span>
                              <span className={styles['cart-page__meta-label']}>
                                Veličina
                              </span>
                              <span className={styles['cart-page__meta-value']}>
                                — {item?.size} cm
                              </span>
                            </div>

                            {item?.description && (
                              <p className={styles['cart-page__item-desc']}>
                                {item.description}
                              </p>
                            )}

                            <div
                              className={styles['cart-page__item-unitprice']}
                            >
                              {unitPrice} RSD <span>(cena po komadu)</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles['cart-page__item-right']}>
                          <div className={styles['cart-page__item-counter']}>
                            <button
                              type="button"
                              className={styles['cart-page__item-counter-btn']}
                              onClick={() => handleDecrease(item)}
                              disabled={qty === 1}
                              aria-label="Smanji količinu"
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
                              disabled={qty === 10}
                              aria-label="Povećaj količinu"
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
                            {lineTotal} RSD
                          </div>

                          <button
                            type="button"
                            className={styles['cart-page__item-remove']}
                            onClick={() => handleRemove(item)}
                            aria-label="Ukloni iz korpe"
                          >
                            <HiMiniXMark size={26} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles['cart-page__empty']}>
                  Vaša korpa je prazna.
                </div>
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
                      Ukupno za plaćanje:
                    </span>
                    <span className={styles['cart-page__total-value']}>
                      {totalPrice} RSD
                    </span>
                  </div>
                </section>

                {/* SAVED */}
                {savedCustomers.length > 0 && (
                  <section className={styles['cart-page__section']}>
                    <div className={styles['cart-page__saved']}>
                      <div className={styles['cart-page__saved-title']}>
                        Sačuvani kupci
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
                            >
                              <span
                                className={styles['cart-page__saved-line-main']}
                              >
                                {c.fullName || 'Nepoznat korisnik'} • {c.email}
                              </span>
                              <span
                                className={styles['cart-page__saved-line-sub']}
                              >
                                {c.address && `${c.address} • `}
                                {c.phone || 'bez broja'}
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
                        placeholder="Ime i prezime"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        leftIcon={<FiUser size={16} />}
                      />

                      <SidebarCartFormField
                        type="tel"
                        placeholder="Broj telefona"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        leftIcon={<FiPhone size={16} />}
                      />
                    </div>

                    <div className={styles['cart-page__form-row']}>
                      <SidebarCartFormField
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<FiMail size={16} />}
                      />

                      <SidebarCartFormField
                        as="textarea"
                        placeholder="Napomena"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        leftIcon={<FiMessageSquare size={16} />}
                      />
                    </div>

                    {/* RADIOs + MESSAGES (isto kao u SidebarCartPreview) */}
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
                            disabled={!delivery.allowed}
                            className={styles['cart-page__form-radio-input']}
                          />
                          <span
                            className={styles['cart-page__form-radio-box']}
                          />
                          <span
                            className={styles['cart-page__form-radio-label']}
                          >
                            Dostava
                          </span>
                        </label>

                        <label className={styles['cart-page__form-radio']}>
                          <input
                            type="radio"
                            name="orderType"
                            value="pickup"
                            checked={orderType === 'pickup'}
                            onChange={() => setOrderType('pickup')}
                            className={styles['cart-page__form-radio-input']}
                          />
                          <span
                            className={styles['cart-page__form-radio-box']}
                          />
                          <span
                            className={styles['cart-page__form-radio-label']}
                          >
                            Preuzimanje
                          </span>
                        </label>
                      </div>

                      {/* poruka UVEK ispod (10px) */}
                      <div
                        className={clsx(
                          styles['cart-page__delivery-message'],
                          !delivery.allowed &&
                            styles['cart-page__delivery-message--error'],
                        )}
                        role="status"
                        aria-live="polite"
                      >
                        {delivery.allowed
                          ? 'Dostava je dostupna za sadržaj korpe.'
                          : (delivery.reason ??
                            'Dostava nije dostupna za sadržaj korpe.')}
                      </div>

                      <div
                        className={styles['cart-page__cash-message']}
                        role="note"
                      >
                        Plaćanje prihvatamo samo u gotovini.
                      </div>
                    </div>

                    {orderType === 'delivery' && (
                      <div className={styles['cart-page__form-row']}>
                        <SidebarCartFormField
                          type="text"
                          placeholder="Adresa (ulica, broj, sprat...)"
                          value={address}
                          leftIcon={<FiMapPin />}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className={styles['cart-page__submit']}
                      disabled={
                        !hasItems ||
                        (orderType === 'delivery' && !delivery.allowed)
                      }
                    >
                      Poruči
                      <HandPointerSvg />
                    </button>

                    <p className={styles['cart-page__form-note']}>
                      Slanjem porudžbine potvrđujete tačnost podataka i dajete
                      saglasnost za obradu ličnih podataka.
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
