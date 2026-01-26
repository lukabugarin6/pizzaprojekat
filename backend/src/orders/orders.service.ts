import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';
import { OrderType } from './order-type.enum';

import { CreateOrderDto } from './dto/create-order.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

import { ProductVariant } from '../products/product-variant.entity';
import { Language } from '../common/enums/language.enum';
import { AdminListOrdersDto } from './dto/admin-list.dto';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    private eventEmitter: EventEmitter2,
  ) {}

  private toAdminNewOrderPayload(o: Order) {
    return {
      id: o.id,
      publicCode: o.publicCode,
      type: o.type,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,

      fullName: o.fullName,
      phone: o.phone,
      email: o.email,
      addressText: o.addressText,
      note: o.note,

      items: (o.items ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantSize: i.variantSize,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    };
  }

  // ========= PUBLIC (GUEST) =========

  async create(dto: CreateOrderDto, acceptLanguage?: string) {
    if (dto.type === OrderType.DELIVERY) {
      if (!dto.addressText?.trim()) {
        throw new BadRequestException('Address is required for delivery.');
      }
    }

    // normalize + merge duplicate variantIds
    const merged = new Map<string, number>();
    for (const it of dto.items ?? []) {
      const id = String(it.variantId).trim();
      if (!id) continue;
      merged.set(id, (merged.get(id) ?? 0) + Number(it.quantity ?? 0));
    }

    const variantIds = Array.from(merged.keys());
    if (!variantIds.length) {
      throw new BadRequestException('Items are required.');
    }

    // učitaj varijante + product + translations (snapshot name)
    const variants = await this.variantRepo.find({
      where: { id: In(variantIds) },
      relations: {
        product: { translations: true },
      } as any,
    });

    if (variants.length !== variantIds.length) {
      const found = new Set(variants.map((v) => v.id));
      const missing = variantIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid variant(s): ${missing.join(', ')}`,
      );
    }

    // (optional) validacija da je product aktivan
    for (const v of variants) {
      if (!v.product?.isActive) {
        throw new BadRequestException(`Product inactive for variant: ${v.id}`);
      }
    }

    const lang = Language['SR_LATN' as any] ?? ('sr-Latn' as any as Language);
    const acceptedLang = this.pickLanguage(acceptLanguage);

    const items: OrderItem[] = [];
    let total = 0;

    // admin uvek SR
    const adminLang =
      Language['SR_LATN' as any] ?? ('sr-Latn' as any as Language);

    // customer (en/ru/sr...) iz headera
    const customerLang = acceptedLang;

    for (const v of variants) {
      const qty = merged.get(v.id) ?? 0;
      if (qty <= 0) continue;

      const productNameAdmin = this.pickProductName(
        v.product?.translations,
        adminLang,
      );

      const productNameCustomer = this.pickProductName(
        v.product?.translations,
        customerLang,
      );

      const unitPrice = Number(v.price);
      const lineTotal = unitPrice * qty;

      const oi = this.itemRepo.create({
        productId: v.product.id,
        variantId: v.id,

        // ✅ admin view
        productName: productNameAdmin ?? productNameCustomer ?? '',

        // ✅ mail / guest view
        productNameCustomer: productNameCustomer ?? productNameAdmin ?? null,

        variantSize: v.size ?? null,
        unitPrice,
        quantity: qty,
        lineTotal,
      });

      items.push(oi);
      total += lineTotal;
    }

    if (!items.length) throw new BadRequestException('Items are invalid.');

    const publicCode = this.genPublicCode(8);
    const accessToken = randomBytes(24).toString('hex'); // 48 chars

    const order = this.orderRepo.create({
      publicCode,
      accessToken,
      email: dto.email.trim(),
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      note: dto.note?.trim() ?? null,
      type: dto.type,
      language: acceptedLang,
      addressText:
        dto.type === OrderType.DELIVERY ? dto.addressText!.trim() : null,
      status: OrderStatus.PENDING,
      items,
      total,
    });

    const saved = await this.orderRepo.save(order);

    // ✅ emit event (gateway listens and pushes to WS clients)
    const full = await this.orderRepo.findOne({
      where: { id: saved.id } as any,
      relations: { items: true } as any,
    });

    if (full) {
      this.eventEmitter.emit('orders.new', this.toAdminNewOrderPayload(full));
    } else {
      // fallback (shouldn't happen)
      this.eventEmitter.emit('orders.new', {
        id: saved.id,
        publicCode: saved.publicCode,
        type: saved.type,
        status: saved.status,
        total: saved.total,
        createdAt: saved.createdAt,
      });
    }

    return {
      publicCode: saved.publicCode,
      token: saved.accessToken,
      status: saved.status,
      total: saved.total,
    };
  }

  async getPublicStatus(publicCode: string, token: string) {
    if (!token?.trim()) throw new BadRequestException('token is required');

    const order = await this.orderRepo.findOne({
      where: { publicCode, accessToken: token },
      relations: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    return {
      publicCode: order.publicCode,
      status: order.status,
      etaMinutes: order.etaMinutes,
      type: order.type,
      addressText: order.addressText,
      fullName: order.fullName,
      phone: order.phone,
      email: order.email,
      total: order.total,
      items: (order.items ?? []).map((i) => ({
        productName: i.productName,
        variantSize: i.variantSize,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
      createdAt: order.createdAt,
    };
  }

  // ========= ADMIN =========

  async adminList(q: AdminListOrdersDto) {
    const where = q.status ? ({ status: q.status } as any) : ({} as any);

    const orders = await this.orderRepo.find({
      where,
      relations: { items: true, handledBy: true } as any,
      order: { createdAt: 'DESC' as any } as any,
      take: 200, // ili ostavi 50; za "sve" često je bolje 200 + pagination kasnije
    });

    return orders.map((o) => ({
      id: o.id,
      publicCode: o.publicCode,
      type: o.type,
      fullName: o.fullName,
      phone: o.phone,
      email: o.email,
      addressText: o.addressText,
      note: o.note,
      status: o.status,
      etaMinutes: o.etaMinutes,
      total: o.total,
      createdAt: o.createdAt,
      handledAt: o.handledAt,
      handledBy: o.handledBy
        ? { id: o.handledBy.id, email: o.handledBy.email }
        : null,
      items: (o.items ?? []).map((i) => ({
        id: i.id,
        productName: i.productName,
        variantSize: i.variantSize,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    }));
  }

  async adminAccept(orderId: string, dto: AcceptOrderDto, adminUserId: number) {
    if (!adminUserId) throw new UnauthorizedException();

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);

      const order = await repo.findOne({
        where: { id: orderId } as any,
        lock: { mode: 'pessimistic_write' }, // štiti od duplog accept-a
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException('Order already handled');
      }

      order.status = OrderStatus.ACCEPTED;
      order.etaMinutes = dto.etaMinutes;
      order.handledAt = new Date();
      order.handledBy = { id: adminUserId } as any;

      await repo.save(order);

      // ✅ emit event (gateway listens and pushes to WS clients)
      this.eventEmitter.emit('orders.update', {
        publicCode: order.publicCode,
        status: order.status,
        etaMinutes: order.etaMinutes,
        type: order.type,
        addressText: order.addressText,
        total: order.total,
        createdAt: order.createdAt,
        language: order.language,
        email: order.email,
        fullName: order.fullName,
      });

      return {
        ok: true,
        id: order.id,
        publicCode: order.publicCode,
        status: order.status,
        etaMinutes: order.etaMinutes,
      };
    });
  }

  async adminReject(orderId: string, dto: RejectOrderDto, adminUserId: number) {
    if (!adminUserId) throw new UnauthorizedException();

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);

      const order = await repo.findOne({
        where: { id: orderId } as any,
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException('Order already handled');
      }

      order.status = OrderStatus.REJECTED;
      order.etaMinutes = null;
      order.reason = dto.reason?.trim() || null;
      order.handledAt = new Date();
      order.handledBy = { id: adminUserId } as any;

      await repo.save(order);

      // ✅ emit event (gateway listens and pushes to WS clients)
      this.eventEmitter.emit('orders.update', {
        publicCode: order.publicCode,
        status: order.status,
        etaMinutes: order.etaMinutes,
        type: order.type,
        addressText: order.addressText,
        total: order.total,
        createdAt: order.createdAt,
        reason: order.reason,
        language: order.language,
        email: order.email,
        fullName: order.fullName,
      });

      return {
        ok: true,
        id: order.id,
        publicCode: order.publicCode,
        status: order.status,
      };
    });
  }

  // ========= helpers =========

  private genPublicCode(len = 8) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez O/0/1/I
    let out = '';
    for (let i = 0; i < len; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  private pickLanguage(acceptLanguage?: string): Language {
    // tvoj enum je Language (sr-Latn, sr-Cyrl, en, ...).
    // MVP: ako accept-language sadrži "sr" → sr-Latn, else en (ako postoji) ili sr-Latn.
    const raw = (acceptLanguage ?? '').toLowerCase();
    if (raw.includes('sr'))
      return Language['SR_LATN' as any] ?? ('sr-Latn' as any as Language);
    return (Language['EN' as any] ?? ('en' as any as Language)) as Language;
  }

  private pickProductName(
    translations: any[] | undefined,
    lang: Language,
  ): string | null {
    if (!translations?.length) return null;

    const want = String(lang).toLowerCase();
    const exact = translations.find(
      (t) => String(t.language).toLowerCase() === want,
    );
    if (exact?.name) return exact.name;

    // fallback: prvi koji ima name
    const anyTr = translations.find((t) => t?.name);
    return anyTr?.name ?? null;
  }

  async findByPublicCodeForMail(publicCode: string) {
    return this.orderRepo.findOne({
      where: { publicCode } as any,
      relations: { items: true } as any,
      // items nisu obavezni za status mail, ali možeš uključiti ako treba
    });
  }
}
