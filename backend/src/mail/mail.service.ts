// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Language } from '../common/enums/language.enum';

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendOrderStatusEmail(params: {
    to: string;
    fullName: string;
    publicCode: string;
    status: 'ACCEPTED' | 'REJECTED';
    language: Language;
    etaMinutes?: number | null;
    reason?: string | null;
  }) {
    const { to, fullName, publicCode, status, language, etaMinutes, reason } =
      params;

    const subject =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedSubject')
        : this.t(language, 'rejectedSubject');

    const text =
      status === 'ACCEPTED'
        ? this.t(language, 'acceptedBody', { fullName, publicCode, etaMinutes })
        : this.t(language, 'rejectedBody', { fullName, publicCode, reason });

    await this.mailer.sendMail({
      to,
      subject,
      text,
      // html: ... (kasnije templati)
    });
  }

  private t(lang: Language, key: string, vars: any = {}) {
    // MVP: vrlo jednostavno (kasnije templating)
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
