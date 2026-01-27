// src/notifications/expo-push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Expo from 'expo-server-sdk';

@Injectable()
export class ExpoPushService {
  private expo = new Expo();
  private logger = new Logger(ExpoPushService.name);

  async sendNewOrder(tokens: string[], data: any) {
    const messages = tokens
      .filter((t) => Expo.isExpoPushToken(t))
      .map((to) => ({
        to,
        sound: 'default',
        title: 'Nova porudžbina',
        body: `Kod: ${data.publicCode} ${Math.round(data.total ?? 0)} RSD`,
        data, // ⚠️ bitno: ide ceo payload
      }));

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        for (const r of receipts) {
          if (r.status === 'error') {
            this.logger.warn(
              `Push error: ${r.message} ${JSON.stringify(r.details ?? {})}`,
            );
          }
        }
      } catch (e) {
        this.logger.error('Push chunk failed', e);
      }
    }
  }
}
