'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Image from 'next/image';
import { CiRuler } from 'react-icons/ci';
import { HiMiniXMark } from 'react-icons/hi2';
import { FiUser, FiPhone, FiMail, FiMessageSquare } from 'react-icons/fi';

import styles from './sidebar-cart-preview.module.scss';
import { useCart } from '@/context/cart/cart-context';
import SidebarCartFormField from './sidebar-cart-form-field';
import HandPointerSvg from '@/components/svg/hand-pointer-svg';

type SidebarCartPreviewProps = {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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
}: SidebarCartPreviewProps) {
  const {
    items = [],
    totalPrice,
    updateItemQuantity,
    removeFromCart,
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
    setOrderType(customer.orderType || 'pickup');
    setAddress(customer.address || '');
    // 👇 sada prepopunjava i napomenu ako je sačuvana
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
          !hasItems && styles['sidebar-cart__panel--empty']
        )}
      >
        <div className={styles['sidebar-cart__inner']}>
          {hasItems && (
            <header className={styles['sidebar-cart__header']}>
              <div className={styles['sidebar-cart__header-main']}>
                <h3 className={styles['sidebar-cart__header-title']}>
                  Vaša korpa
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
                          <div className={styles['sidebar-cart__item-meta']}>
                            <span className={styles['sidebar-cart__meta-icon']}>
                              <CiRuler size={20} />
                            </span>
                            <span
                              className={styles['sidebar-cart__meta-label']}
                            >
                              Veličina
                            </span>
                            <span
                              className={styles['sidebar-cart__meta-value']}
                            >
                              — {item?.size} cm
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles['sidebar-cart__item-right']}>
                        <div className={styles['sidebar-cart__item-counter']}>
                          <button
                            type="button"
                            className={styles['sidebar-cart__item-counter-btn']}
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

                        <div className={styles['sidebar-cart__item-price']}>
                          {lineTotal} RSD
                        </div>

                        <button
                          type="button"
                          className={styles['sidebar-cart__item-remove']}
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
              <div className={styles['sidebar-cart__empty']}>
                Vaša korpa je prazna.
              </div>
            )}
          </div>

          {hasItems && (
            <footer className={styles['sidebar-cart__footer']}>
              <div className={styles['sidebar-cart__footer-row']}>
                <span className={styles['sidebar-cart__footer-label']}>
                  Ukupno za plaćanje:
                </span>
                <span className={styles['sidebar-cart__footer-value']}>
                  {totalPrice} RSD
                </span>
              </div>

              {savedCustomers.length > 0 && (
                <div className={styles['sidebar-cart__saved']}>
                  <div className={styles['sidebar-cart__saved-title']}>
                    Sačuvani kupci
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
                            {c.fullName || 'Nepoznat korisnik'} • {c.email}
                          </span>
                          <span
                            className={styles['sidebar-cart__saved-line-sub']}
                          >
                            {c.address && `${c.address} • `}
                            {c.phone || 'bez broja'}
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
                    styles['sidebar-cart__form-row--inputs']
                  )}
                >
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

                {/* red 2: email + napomena */}
                <div
                  className={clsx(
                    styles['sidebar-cart__form-row'],
                    styles['sidebar-cart__form-row--inputs']
                  )}
                >
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

                {/* red 3: radio dugmad */}
                <div className={styles['sidebar-cart__form-row']}>
                  <div className={styles['sidebar-cart__form-radios']}>
                    <label className={styles['sidebar-cart__form-radio']}>
                      <input
                        type="radio"
                        name="orderType"
                        value="delivery"
                        checked={orderType === 'delivery'}
                        onChange={() => setOrderType('delivery')}
                        className={styles['sidebar-cart__form-radio-input']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-box']}
                      />
                      <span
                        className={styles['sidebar-cart__form-radio-label']}
                      >
                        Dostava
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
                        Preuzimanje
                      </span>
                    </label>
                  </div>
                </div>

                {/* red 4: adresa */}
                {orderType === 'delivery' && (
                  <div className={styles['sidebar-cart__form-row']}>
                    <SidebarCartFormField
                      type="text"
                      placeholder="Adresa (ulica, broj, sprat...)"
                      value={address}
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
                  Naruči
                  <HandPointerSvg />
                </button>

                <p className={styles['sidebar-cart__form-note']}>
                  Slanjem porudžbine potvrđujete tačnost podataka i dajete
                  saglasnost za obradu ličnih podataka.
                </p>
              </form>
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
