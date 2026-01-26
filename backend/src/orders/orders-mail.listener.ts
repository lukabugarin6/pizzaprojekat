// orders/orders.mail.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { MailService } from '../mail/mail.service';
import { OrderStatus } from './order-status.enum';

type OrdersUpdatePayload = {
  publicCode: string;
  status?: OrderStatus;
  etaMinutes?: number | null;
  reason?: string | null;

  // optional details (if provided)
  email?: string | null;
  fullName?: string | null;
  language?: any;
  type?: string | null;
  phone?: string | null;
  addressText?: string | null;
  note?: string | null;
  total?: number | null;
  createdAt?: string | Date | null;
  items?: Array<{
    productName: string;
    variantSize?: string | number | null;
    quantity?: number | null;
    lineTotal?: number | null;
  }>;
};

@Injectable()
export class OrdersMailListener {
  private readonly logger = new Logger(OrdersMailListener.name);

  constructor(
    private ordersService: OrdersService,
    private mailService: MailService,
  ) {}

  @OnEvent('orders.update')
  async handleOrderUpdate(payload: OrdersUpdatePayload) {
    try {
      this.logger.log(
        `orders.update received: ${payload.publicCode} status=${payload.status ?? 'n/a'}`,
      );

      // ✅ payload-first if we have enough to send
      const canSendFromPayload =
        !!payload.status &&
        !!payload.publicCode &&
        !!payload.email &&
        !!payload.fullName;

      if (canSendFromPayload) {
        const common = {
          to: payload.email!,
          fullName: payload.fullName!,
          publicCode: payload.publicCode,
          language: payload.language,

          type: payload.type ?? null,
          phone: payload.phone ?? null,
          email: payload.email!,
          addressText: payload.addressText ?? null,
          note: payload.note ?? null,
          total: payload.total ?? null,
          createdAt: payload.createdAt ?? null,
          items: payload.items ?? [],
        };

        if (payload.status === OrderStatus.ACCEPTED) {
          await this.mailService.sendOrderStatusEmail({
            ...common,
            status: 'ACCEPTED',
            etaMinutes: payload.etaMinutes ?? null,
          });
          this.logger.log(`mail sent (payload) code=${payload.publicCode}`);
          return;
        }

        if (payload.status === OrderStatus.REJECTED) {
          await this.mailService.sendOrderStatusEmail({
            ...common,
            status: 'REJECTED',
            reason: payload.reason ?? null,
          });
          this.logger.log(`mail sent (payload) code=${payload.publicCode}`);
          return;
        }
      }

      // 🔁 fallback to DB
      const order = await this.ordersService.findByPublicCodeForMail(
        payload.publicCode,
      );
      if (!order) return;

      this.logger.log(
        `mail-check (db) code=${order.publicCode} status=${order.status}`,
      );

      const common = {
        to: order.email,
        fullName: order.fullName,
        publicCode: order.publicCode,
        language: order.language,

        type: (order as any).type,
        phone: (order as any).phone ?? null,
        email: order.email,
        addressText: (order as any).addressText ?? null,
        note: (order as any).note ?? null,
        total: (order as any).total ?? null,
        createdAt: (order as any).createdAt ?? null,
        items: Array.isArray((order as any).items)
          ? (order as any).items.map((i: any) => ({
              productName: i.productName,
              variantSize: i.variantSize ?? null,
              quantity: i.quantity ?? null,
              lineTotal: i.lineTotal ?? null,
            }))
          : [],
      };

      if (order.status === OrderStatus.ACCEPTED) {
        await this.mailService.sendOrderStatusEmail({
          ...common,
          status: 'ACCEPTED',
          etaMinutes: (order as any).etaMinutes ?? null,
        });
        this.logger.log(`mail sent (db) code=${order.publicCode}`);
      } else if (order.status === OrderStatus.REJECTED) {
        await this.mailService.sendOrderStatusEmail({
          ...common,
          status: 'REJECTED',
          reason: (order as any).reason ?? null,
        });
        this.logger.log(`mail sent (db) code=${order.publicCode}`);
      }
    } catch (e: any) {
      this.logger.error(
        `Failed to send order status email for ${payload.publicCode}: ${e?.message ?? e}`,
        e?.stack,
      );
    }
  }
}
