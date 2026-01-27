// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Language } from '../common/enums/language.enum';

type OrderEmailStatus = 'ACCEPTED' | 'REJECTED';

export type OrderEmailItem = {
  productName: string;
  variantSize?: string | number | null;
  quantity?: number | null;
  lineTotal?: number | null;
};

export type SendOrderStatusEmailParams = {
  // required
  to: string;
  fullName: string;
  publicCode: string;
  status: OrderEmailStatus;
  language: Language;

  // optional status fields
  etaMinutes?: number | null;
  reason?: string | null;

  // optional order details (for rich template)
  items?: OrderEmailItem[];
  total?: number | null;
  type?: 'delivery' | 'pickup' | string | null;
  phone?: string | null;
  email?: string | null;
  addressText?: string | null;
  note?: string | null;
  createdAt?: string | Date | null;
};

function escapeHtml(input: any) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoneyRSD(n: any) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0 RSD';
  return `${Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')} RSD`;
}

function langKey(lang: any) {
  return String(lang ?? '').toLowerCase();
}

function isSr(lang: any) {
  const s = langKey(lang);
  return s === 'sr-latn' || s.startsWith('sr');
}

function isRu(lang: any) {
  const s = langKey(lang);
  return s === 'ru' || s.startsWith('ru');
}

function statusLabel(lang: any, status: OrderEmailStatus) {
  if (isSr(lang)) return status === 'ACCEPTED' ? 'Prihvaćeno' : 'Odbijeno';
  if (isRu(lang)) return status === 'ACCEPTED' ? 'Принято' : 'Отклонено';
  return status === 'ACCEPTED' ? 'Accepted' : 'Rejected';
}

function statusColor(status: OrderEmailStatus) {
  return status === 'ACCEPTED' ? '#27AE60' : '#EB5757';
}

function typeLabel(lang: any, type?: string | null) {
  const t = String(type ?? '').toLowerCase();
  const delivery = t.includes('delivery');

  if (isSr(lang)) return delivery ? 'Dostava' : 'Preuzimanje';
  if (isRu(lang)) return delivery ? 'Доставка' : 'Самовывоз';
  return delivery ? 'Delivery' : 'Pickup';
}

function label(lang: any, key: string) {
  const sr = isSr(lang);
  const ru = isRu(lang);

  const dict: Record<string, { sr: string; en: string; ru: string }> = {
    orderDetails: {
      sr: 'Detalji porudžbine',
      en: 'Order details',
      ru: 'Детали заказа',
    },
    status: { sr: 'Status', en: 'Status', ru: 'Статус' },
    code: { sr: 'Kod', en: 'Code', ru: 'Код' },
    items: { sr: 'Stavke', en: 'Items', ru: 'Позиции' },
    total: { sr: 'Ukupna cena', en: 'Total', ru: 'Итого' },
    customer: { sr: 'Kupac', en: 'Customer', ru: 'Клиент' },
    note: { sr: 'Napomena', en: 'Note', ru: 'Комментарий' },
    address: { sr: 'Adresa', en: 'Address', ru: 'Адрес' },
    reason: { sr: 'Razlog', en: 'Reason', ru: 'Причина' },
    eta: { sr: 'Očekivano vreme', en: 'ETA', ru: 'Ожидаемое время' },
    automated: {
      sr: 'Ovo je automatska poruka.',
      en: 'This is an automated message.',
      ru: 'Это автоматическое сообщение.',
    },
    noItems: { sr: '-', en: '-', ru: '-' },
  };

  const bucket = dict[key];
  if (!bucket) return key;
  if (sr) return bucket.sr;
  if (ru) return bucket.ru;
  return bucket.en;
}

function normalizeSize(raw: any): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // If it's a number, assume "cm" (pizza sizes). Otherwise keep as-is (e.g. "XL").
  const n = Number(s);
  if (Number.isFinite(n)) return `${n}cm`;
  return s;
}

function renderOrderEmailHtml(params: SendOrderStatusEmailParams) {
  const {
    language,
    fullName,
    publicCode,
    status,
    etaMinutes,
    reason,
    items = [],
    total,
    type,
    phone,
    email,
    addressText,
    note,
  } = params;

  const statusText = statusLabel(language, status);
  const statusHex = statusColor(status);

  const etaLine =
    status === 'ACCEPTED' &&
    typeof etaMinutes === 'number' &&
    Number.isFinite(etaMinutes)
      ? `<div style="margin-top:6px;color:#666;font-weight:700;">
           ${escapeHtml(label(language, 'eta'))}: <b>${escapeHtml(etaMinutes)} min</b>
         </div>`
      : '';

  const reasonLine =
    status === 'REJECTED' && String(reason ?? '').trim()
      ? `<div style="margin-top:10px;color:#111;font-weight:700;">
           ${escapeHtml(label(language, 'reason'))}:
           <span style="font-weight:600;color:#333;">${escapeHtml(reason)}</span>
         </div>`
      : '';

  const itemsHtml = items.length
    ? items
        .map((it) => {
          const name = escapeHtml(it?.productName ?? '-');

          const size = normalizeSize(it?.variantSize);
          const sizeHtml = size
            ? ` <span style="color:#666;font-weight:800;">• ${escapeHtml(size)}</span>`
            : '';

          const qtyNum = Number(it?.quantity);
          const qtyHtml = Number.isFinite(qtyNum)
            ? ` <span style="color:#111;font-weight:900;">x${qtyNum}</span>`
            : '';

          const ltNum = Number(it?.lineTotal);
          const lineTotalHtml = Number.isFinite(ltNum)
            ? `<span style="float:right;font-weight:900;color:#111;">${formatMoneyRSD(
                ltNum,
              )}</span>`
            : '';

          return `
            <div style="padding:10px 0;border-bottom:1px solid #eee;">
              <span style="font-weight:900;color:#111;">${name}</span>${sizeHtml} ${qtyHtml}
              ${lineTotalHtml}
            </div>
          `;
        })
        .join('')
    : `<div style="padding:10px 0;color:#666;font-weight:700;">${escapeHtml(
        label(language, 'noItems'),
      )}</div>`;

  const totalHtml =
    total !== null && total !== undefined && Number.isFinite(Number(total))
      ? `<div style="padding:12px 0;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
           <div style="font-weight:800;color:#666;">${escapeHtml(
             label(language, 'total'),
           )}: </div>
           <div style="font-weight:900;color:#111;font-size:18px;">${formatMoneyRSD(
             total,
           )}</div>
         </div>`
      : '';

  const showDelivery =
    String(type ?? '')
      .toLowerCase()
      .includes('delivery') && String(addressText ?? '').trim();

  const customerBlock = `
    <div style="padding:12px 0;border-top:1px solid #eee;">
      <div style="font-weight:800;color:#666;margin-bottom:6px;">${escapeHtml(
        label(language, 'customer'),
      )}</div>
      <div style="font-weight:900;color:#111;">${escapeHtml(fullName)}</div>

      ${
        phone
          ? `<div style="margin-top:6px;font-weight:700;color:#111;">📞 ${escapeHtml(
              phone,
            )}</div>`
          : ''
      }
      ${
        (email ?? params.to)
          ? `<div style="margin-top:6px;font-weight:700;color:#111;">✉️ ${escapeHtml(
              email ?? params.to,
            )}</div>`
          : ''
      }

      ${
        String(note ?? '').trim()
          ? `<div style="margin-top:10px;">
               <div style="font-weight:800;color:#666;margin-bottom:6px;">${escapeHtml(
                 label(language, 'note'),
               )}</div>
               <div style="font-weight:700;color:#111;">${escapeHtml(note)}</div>
             </div>`
          : ''
      }

      ${
        showDelivery
          ? `<div style="margin-top:10px;">
               <div style="font-weight:800;color:#666;margin-bottom:6px;">${escapeHtml(
                 label(language, 'address'),
               )}</div>
               <div style="font-weight:700;color:#111;">${escapeHtml(
                 addressText,
               )}</div>
             </div>`
          : ''
      }
    </div>
  `;

  return `
  <div style="background:#f6f6f6;padding:20px 12px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;">
      <div style="padding:16px 16px 10px 16px;border-bottom:1px solid #eee;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-size:18px;font-weight:900;color:#111;">${escapeHtml(
              label(language, 'orderDetails'),
            )}</div>

            <div style="margin-top:6px;color:#666;font-weight:700;">${escapeHtml(
              typeLabel(language, type ?? undefined),
            )}</div>

            ${etaLine}
            ${reasonLine}
          </div>

          <div style="text-align:right;">
            <div style="font-weight:800;color:#666;">${escapeHtml(
              label(language, 'status'),
            )}</div>
            <div style="margin-top:4px;font-weight:900;color:${statusHex};">${escapeHtml(
              statusText,
            )}</div>
          </div>
        </div>

        <div style="margin-top:14px;color:#666;font-weight:800;">
          ${escapeHtml(label(language, 'code'))}:
          <span style="font-weight:900;color:#111;">${escapeHtml(publicCode)}</span>
        </div>
      </div>

      <div style="padding:0 16px;">
        <div style="padding:12px 0;">
          <div style="font-weight:800;color:#666;margin-bottom:6px;">${escapeHtml(
            label(language, 'items'),
          )}</div>
          ${itemsHtml}
        </div>

        ${totalHtml}
        ${customerBlock}
      </div>

      <div style="padding:14px 16px;border-top:1px solid #eee;color:#999;font-weight:700;font-size:12px;">
        ${escapeHtml(label(language, 'automated'))}
      </div>
    </div>
  </div>
  `;
}

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendOrderStatusEmail(params: SendOrderStatusEmailParams) {
    const { to, fullName, publicCode, status, language, etaMinutes, reason } =
      params;

    const subject =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedSubject', { publicCode })
        : this.t(language, 'rejectedSubject', { publicCode });

    const text =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedBody', { fullName, publicCode, etaMinutes })
        : this.t(language, 'rejectedBody', { fullName, publicCode, reason });

    const html = renderOrderEmailHtml({
      ...params,
      email: params.email ?? params.to,
    });

    await this.mailer.sendMail({
      to,
      subject,
      text,
      html,
    });
  }

  private t(lang: Language, key: string, vars: any = {}) {
    const dict: Record<string, any> = {
      'sr-Latn': {
        acceptedSubject: `Porudžbina ${vars.publicCode ?? ''} je prihvaćena`,
        rejectedSubject: `Porudžbina ${vars.publicCode ?? ''} je odbijena`,
        acceptedBody: `Zdravo ${vars.fullName},\n\nVaša porudžbina ${vars.publicCode} je prihvaćena.${
          vars.etaMinutes ? ` Očekivano vreme: ${vars.etaMinutes} min.` : ''
        }\n\nHvala!`,
        rejectedBody: `Zdravo ${vars.fullName},\n\nVaša porudžbina ${vars.publicCode} je odbijena.${
          vars.reason ? ` Razlog: ${vars.reason}` : ''
        }\n\nHvala!`,
      },
      en: {
        acceptedSubject: `Order ${vars.publicCode ?? ''} accepted`,
        rejectedSubject: `Order ${vars.publicCode ?? ''} rejected`,
        acceptedBody: `Hi ${vars.fullName},\n\nYour order ${vars.publicCode} was accepted.${
          vars.etaMinutes ? ` ETA: ${vars.etaMinutes} minutes.` : ''
        }\n\nThanks!`,
        rejectedBody: `Hi ${vars.fullName},\n\nYour order ${vars.publicCode} was rejected.${
          vars.reason ? ` Reason: ${vars.reason}` : ''
        }\n\nThanks!`,
      },
      ru: {
        acceptedSubject: `Заказ ${vars.publicCode ?? ''} принят`,
        rejectedSubject: `Заказ ${vars.publicCode ?? ''} отклонён`,
        acceptedBody: `Здравствуйте, ${vars.fullName}.\n\nВаш заказ ${vars.publicCode} принят.${
          vars.etaMinutes ? ` Ожидаемое время: ${vars.etaMinutes} мин.` : ''
        }\n\nСпасибо!`,
        rejectedBody: `Здравствуйте, ${vars.fullName}.\n\nВаш заказ ${vars.publicCode} отклонён.${
          vars.reason ? ` Причина: ${vars.reason}` : ''
        }\n\nСпасибо!`,
      },
    };

    const k = String(lang);
    const bucket =
      dict[k] ??
      (isRu(lang) ? dict.ru : null) ??
      (isSr(lang) ? dict['sr-Latn'] : null) ??
      dict.en;

    return bucket[key] ?? '';
  }
}
