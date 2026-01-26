// orders/orders.mail.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { MailService } from '../mail/mail.service';
import { OrderStatus } from './order-status.enum';

@Injectable()
export class OrdersMailListener {
  private readonly logger = new Logger(OrdersMailListener.name);

  constructor(
    private ordersService: OrdersService,
    private mailService: MailService,
  ) {}

  @OnEvent(
    'orders.update',
    // , { suppressErrors: true }
  )
  async handleOrderUpdate(payload: { publicCode: string }) {
    try {
      this.logger.log(`orders.update received: ${payload.publicCode}`);
      const order = await this.ordersService.findByPublicCodeForMail(
        payload.publicCode,
      );
      if (!order) return;

      // ✅ zajednički “details” koji idu u template
      const common = {
        to: order.email,
        fullName: order.fullName,
        publicCode: order.publicCode,
        language: order.language,

        // details
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
      } else if (order.status === OrderStatus.REJECTED) {
        await this.mailService.sendOrderStatusEmail({
          ...common,
          status: 'REJECTED',
          reason: (order as any).reason ?? null,
        });
      }
    } catch (e: any) {
      this.logger.error(
        `Failed to send order status email for ${payload.publicCode}: ${e?.message ?? e}`,
        e?.stack,
      );
    }
  }
}
