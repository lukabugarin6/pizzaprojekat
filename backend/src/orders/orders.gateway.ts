import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

import { OrdersService } from './orders.service';
import { Role } from '../common/enums/role.enum';

type SubscribeOrderPayload = {
  publicCode: string;
  token: string; // order.accessToken (guest token)
};

@WebSocketGateway({
  namespace: '/orders',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly ordersService: OrdersService,
  ) {}

  // ---------- connection ----------
  async handleConnection(client: Socket) {
    const jwt = this.extractBearer(client);
    console.log('[orders ws] connect', { hasJwt: !!jwt });

    if (!jwt) return;

    try {
      const payload: any = await this.jwtService.verifyAsync(jwt);
      console.log('[orders ws] payload', payload);

      const role: string = payload?.rolee ?? [];
      console.log('[orders ws] roles', role);

      const isAdmin = role === Role.ADMIN || role === Role.SUPERUSER;
      console.log('[orders ws] isAdmin', isAdmin);

      if (isAdmin) client.join('admins');
    } catch (e) {
      console.log('[orders ws] jwt verify failed', e?.message);
    }
  }

  handleDisconnect(_client: Socket) {
    // nothing special
  }

  // ---------- guest subscribe ----------
  @SubscribeMessage('order:subscribe')
  async onOrderSubscribe(
    @MessageBody() body: SubscribeOrderPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const publicCode = String(body?.publicCode ?? '').trim();
    const token = String(body?.token ?? '').trim();

    if (!publicCode || !token) {
      throw new UnauthorizedException('publicCode and token are required');
    }

    // validate guest token against order
    const order = await this.ordersService.getPublicStatus(publicCode, token);

    const room = this.orderRoom(publicCode);
    client.join(room);

    // send initial snapshot
    client.emit('order:update', order);

    return { ok: true };
  }

  @SubscribeMessage('order:unsubscribe')
  async onOrderUnsubscribe(
    @MessageBody() body: { publicCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    const publicCode = String(body?.publicCode ?? '').trim();
    if (!publicCode) return { ok: true };

    client.leave(this.orderRoom(publicCode));
    return { ok: true };
  }

  // ---------- event listeners (from OrdersService) ----------
  @OnEvent('orders.new')
  handleOrdersNew(payload: any) {
    this.emitNewOrderToAdmins(payload);
  }

  @OnEvent('orders.update')
  handleOrdersUpdate(payload: any) {
    const publicCode = String(payload?.publicCode ?? '').trim();
    if (!publicCode) return;

    this.emitOrderUpdate(publicCode, payload);
  }

  // ---------- server emit helpers ----------
  emitNewOrderToAdmins(payload: any) {
    this.server.to('admins').emit('orders:new', payload);
  }

  emitOrderUpdate(publicCode: string, payload: any) {
    this.server.to(this.orderRoom(publicCode)).emit('order:update', payload);
  }

  // ---------- helpers ----------
  private orderRoom(publicCode: string) {
    return `order:${publicCode}`;
  }

  private extractBearer(client: Socket): string | null {
    // prefer auth.token (socket.io-client option), fallback to Authorization header
    const t1 = client.handshake.auth?.token;
    if (typeof t1 === 'string' && t1.trim()) return t1.trim();

    const h = client.handshake.headers?.authorization;
    if (typeof h === 'string') {
      const m = h.match(/^Bearer\s+(.+)$/i);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }
}
