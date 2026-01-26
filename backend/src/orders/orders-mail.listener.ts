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

  @OnEvent('orders.update', { suppressErrors: true })
  async handleOrderUpdate(payload: { publicCode: string }) {
    try {
      const order = await this.ordersService.findByPublicCodeForMail(
        payload.publicCode,
      );
      if (!order) return;

      if (order.status === OrderStatus.ACCEPTED) {
        await this.mailService.sendOrderStatusEmail({
          to: order.email,
          fullName: order.fullName,
          publicCode: order.publicCode,
          status: 'ACCEPTED',
          language: order.language,
          etaMinutes: order.etaMinutes,
        });
      }

      if (order.status === OrderStatus.REJECTED) {
        await this.mailService.sendOrderStatusEmail({
          to: order.email,
          fullName: order.fullName,
          publicCode: order.publicCode,
          status: 'REJECTED',
          language: order.language,
          reason: order.reason,
        });
      }
    } catch (e: any) {
      this.logger.error(
        `Failed to send order status email for ${payload.publicCode}: ${e?.message ?? e}`,
        e?.stack,
      );
      // suppressErrors:true već sprečava da ovo “propagates”
    }
  }
}
