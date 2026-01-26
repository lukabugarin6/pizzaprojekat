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

function isSr(lang: any) {
  const s = String(lang ?? '').toLowerCase();
  return s === 'sr-latn' || s.startsWith('sr');
}

function statusLabel(lang: any, status: OrderEmailStatus) {
  if (isSr(lang)) return status === 'ACCEPTED' ? 'Prihvaćeno' : 'Odbijeno';
  return status === 'ACCEPTED' ? 'Accepted' : 'Rejected';
}

function statusColor(status: OrderEmailStatus) {
  return status === 'ACCEPTED' ? '#27AE60' : '#EB5757';
}

function typeLabel(lang: any, type?: string | null) {
  const t = String(type ?? '').toLowerCase();
  const delivery = t.includes('delivery');
  if (isSr(lang)) return delivery ? 'Dostava' : 'Preuzimanje';
  return delivery ? 'Delivery' : 'Pickup';
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

  const sr = isSr(language);
  const title = sr ? 'Detalji porudžbine' : 'Order details';

  const statusText = statusLabel(language, status);
  const statusHex = statusColor(status);

  const etaLine =
    status === 'ACCEPTED' &&
    typeof etaMinutes === 'number' &&
    Number.isFinite(etaMinutes)
      ? sr
        ? `Očekivano vreme: <b>${etaMinutes} min</b>`
        : `ETA: <b>${etaMinutes} min</b>`
      : '';

  const reasonLine =
    status === 'REJECTED' && String(reason ?? '').trim()
      ? `<div style="margin-top:10px;color:#111;font-weight:700;">
           ${sr ? 'Razlog' : 'Reason'}:
           <span style="font-weight:600;color:#333;">${escapeHtml(reason)}</span>
         </div>`
      : '';

  const itemsHtml = items.length
    ? items
        .map((it) => {
          const name = escapeHtml(it?.productName ?? '-');

          const rawSize = it?.variantSize;
          const sizeStr =
            rawSize === null || rawSize === undefined
              ? ''
              : String(rawSize).trim();
          const size =
            sizeStr !== ''
              ? ` <span style="color:#666;font-weight:700;">• ${escapeHtml(sizeStr)}</span>`
              : '';

          const qtyNum = Number(it?.quantity);
          const qty = Number.isFinite(qtyNum)
            ? ` <span style="color:#111;font-weight:800;">x${qtyNum}</span>`
            : '';

          const ltNum = Number(it?.lineTotal);
          const lineTotal = Number.isFinite(ltNum)
            ? `<span style="float:right;font-weight:800;color:#111;">${formatMoneyRSD(
                ltNum,
              )}</span>`
            : '';

          return `
            <div style="padding:10px 0;border-bottom:1px solid #eee;">
              <span style="font-weight:900;color:#111;">${name}</span>${size}${qty}
              ${lineTotal}
            </div>
          `;
        })
        .join('')
    : `<div style="padding:10px 0;color:#666;font-weight:700;">-</div>`;

  const totalHtml =
    total !== null && total !== undefined && Number.isFinite(Number(total))
      ? `<div style="padding:12px 0;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
           <div style="font-weight:800;color:#666;">${sr ? 'Ukupna cena' : 'Total'}</div>
           <div style="font-weight:900;color:#111;font-size:18px;">${formatMoneyRSD(total)}</div>
         </div>`
      : '';

  const customerBlock = `
    <div style="padding:12px 0;border-top:1px solid #eee;">
      <div style="font-weight:800;color:#666;margin-bottom:6px;">${sr ? 'Kupac' : 'Customer'}</div>
      <div style="font-weight:900;color:#111;">${escapeHtml(fullName)}</div>
      ${phone ? `<div style="margin-top:6px;font-weight:700;color:#111;">📞 ${escapeHtml(phone)}</div>` : ''}
      ${email ? `<div style="margin-top:6px;font-weight:700;color:#111;">✉️ ${escapeHtml(email)}</div>` : ''}

      ${
        String(note ?? '').trim()
          ? `<div style="margin-top:10px;">
               <div style="font-weight:800;color:#666;margin-bottom:6px;">${
                 sr ? 'Napomena' : 'Note'
               }</div>
               <div style="font-weight:700;color:#111;">${escapeHtml(note)}</div>
             </div>`
          : ''
      }

      ${
        String(type ?? '')
          .toLowerCase()
          .includes('delivery') && String(addressText ?? '').trim()
          ? `<div style="margin-top:10px;">
               <div style="font-weight:800;color:#666;margin-bottom:6px;">${
                 sr ? 'Adresa' : 'Address'
               }</div>
               <div style="font-weight:700;color:#111;">${escapeHtml(addressText)}</div>
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
            <div style="font-size:18px;font-weight:900;color:#111;">${escapeHtml(title)}</div>
            <div style="margin-top:6px;color:#666;font-weight:700;">${escapeHtml(
              typeLabel(language, type ?? undefined),
            )}</div>
            ${etaLine ? `<div style="margin-top:6px;color:#666;font-weight:700;">${etaLine}</div>` : ''}
            ${reasonLine}
          </div>

          <div style="text-align:right;">
            <div style="font-weight:800;color:#666;">${sr ? 'Status' : 'Status'}</div>
            <div style="margin-top:4px;font-weight:900;color:${statusHex};">${escapeHtml(
              statusText,
            )}</div>
          </div>
        </div>

        <div style="margin-top:14px;color:#666;font-weight:800;">
          ${sr ? 'Kod' : 'Code'}: <span style="font-weight:900;color:#111;">${escapeHtml(
            publicCode,
          )}</span>
        </div>
      </div>

      <div style="padding:0 16px;">
        <div style="padding:12px 0;">
          <div style="font-weight:800;color:#666;margin-bottom:6px;">${sr ? 'Stavke' : 'Items'}</div>
          ${itemsHtml}
        </div>

        ${totalHtml}
        ${customerBlock}
      </div>

      <div style="padding:14px 16px;border-top:1px solid #eee;color:#999;font-weight:700;font-size:12px;">
        ${sr ? 'Ovo je automatska poruka.' : 'This is an automated message.'}
      </div>
    </div>
  </div>
  `;
}

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendOrderStatusEmail(params: SendOrderStatusEmailParams) {
    const {
      to,
      fullName,
      publicCode,
      status,
      language,
      etaMinutes,
      reason,
      items,
      total,
      type,
      phone,
      email,
      addressText,
      note,
      createdAt,
    } = params;

    const subject =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedSubject', { publicCode })
        : this.t(language, 'rejectedSubject', { publicCode });

    const text =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedBody', { fullName, publicCode, etaMinutes })
        : this.t(language, 'rejectedBody', { fullName, publicCode, reason });

    const html = renderOrderEmailHtml({
      to,
      fullName,
      publicCode,
      status,
      language,
      etaMinutes,
      reason,
      items,
      total,
      type,
      phone,
      email: email ?? to,
      addressText,
      note,
      createdAt,
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
    };

    const bucket = dict[String(lang)] ?? dict['sr-Latn'];
    return bucket[key] ?? '';
  }
}
