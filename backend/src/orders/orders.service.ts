// src/orders/orders.service.ts
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
import { DateTime } from 'luxon';

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

import { RestaurantSettings } from '../restaurant/restaurant-settings.entity';
import { RestaurantWorkingHours } from '../restaurant/restaurant-working-hours.entity';
import { RestaurantOverride } from '../restaurant/restaurant-override.entity';

type DeliveryReason =
  | 'empty'
  | 'onlyDrinks'
  | 'needLargePizza'
  | 'forbiddenItems'
  | null;

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,

    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,

    @InjectRepository(RestaurantSettings)
    private settingsRepo: Repository<RestaurantSettings>,
    @InjectRepository(RestaurantWorkingHours)
    private whRepo: Repository<RestaurantWorkingHours>,
    @InjectRepository(RestaurantOverride)
    private overrideRepo: Repository<RestaurantOverride>,

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
    // ✅ MUST be open now
    await this.assertRestaurantOpenNow();

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

    // load variants + product + translations (snapshot name)
    const variants = await this.variantRepo.find({
      where: { id: In(variantIds) },
      relations: { product: { translations: true } } as any,
    });

    if (variants.length !== variantIds.length) {
      const found = new Set(variants.map((v) => v.id));
      const missing = variantIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid variant(s): ${missing.join(', ')}`,
      );
    }

    // validate active products
    for (const v of variants) {
      if (!v.product?.isActive) {
        throw new BadRequestException(`Product inactive for variant: ${v.id}`);
      }
    }

    // ✅ DELIVERY rules (1:1 with frontend getDeliveryEligibility)
    if (dto.type === OrderType.DELIVERY) {
      const delivery = this.getDeliveryEligibilityFromVariants(
        variants,
        merged,
      );

      if (!delivery.allowed) {
        // map reason -> message (keep simple; you can localize later)
        if (delivery.reason === 'empty') {
          throw new BadRequestException('Cart is empty.');
        }
        if (delivery.reason === 'onlyDrinks') {
          throw new BadRequestException(
            'Delivery is not available for drinks only.',
          );
        }
        if (delivery.reason === 'needLargePizza') {
          throw new BadRequestException(
            'Delivery requires at least one large pizza (32cm or 50cm).',
          );
        }
        if (delivery.reason === 'forbiddenItems') {
          throw new BadRequestException(
            'Delivery is not available for sandwiches or small pizzas (24cm).',
          );
        }
        throw new BadRequestException('Delivery is not allowed.');
      }
    }

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
      take: 200,
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

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Order);

      const order = await repo.findOne({
        where: { id: orderId } as any,
        lock: { mode: 'pessimistic_write' },
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

      return {
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
        id: order.id,
      };
    });

    // ✅ emit AFTER COMMIT
    this.eventEmitter.emit('orders.update', result);

    return {
      ok: true,
      id: result.id,
      publicCode: result.publicCode,
      status: result.status,
      etaMinutes: result.etaMinutes,
    };
  }

  async adminReject(orderId: string, dto: RejectOrderDto, adminUserId: number) {
    if (!adminUserId) throw new UnauthorizedException();

    const result = await this.dataSource.transaction(async (manager) => {
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

      return {
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
        id: order.id,
      };
    });

    // ✅ emit AFTER COMMIT
    this.eventEmitter.emit('orders.update', result);

    return {
      ok: true,
      id: result.id,
      publicCode: result.publicCode,
      status: result.status,
    };
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
    const raw = (acceptLanguage ?? '').toLowerCase();

    if (raw.includes('ru')) {
      return (Language['RU' as any] ?? ('ru' as any)) as Language;
    }

    if (raw.includes('sr')) {
      return Language['SR_LATN' as any] ?? ('sr-Latn' as any as Language);
    }

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

    const anyTr = translations.find((t) => t?.name);
    return anyTr?.name ?? null;
  }

  async findByPublicCodeForMail(publicCode: string) {
    return this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'i')
      .where('o.publicCode = :publicCode', { publicCode })
      .getOne();
  }

  // ===== Restaurant open-now logic (timezone + overrides + weekly hours) =====

  private async getRestaurantTimezone(): Promise<string> {
    // single-restaurant assumption: take first settings row if exists
    const [settings] = await this.settingsRepo.find({ take: 1 });
    return settings?.timezone || 'Europe/Belgrade';
  }

  private isTimeWithinWindow(
    nowHHmm: string,
    openHHmm: string,
    closeHHmm: string,
  ) {
    const toMin = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };

    const now = toMin(nowHHmm);
    const open = toMin(openHHmm);
    const close = toMin(closeHHmm);

    if (open === close) return false;

    // same-day window
    if (close > open) return now >= open && now < close;

    // overnight window (e.g. 18:00 -> 02:00)
    return now >= open || now < close;
  }

  private async assertRestaurantOpenNow() {
    const tz = await this.getRestaurantTimezone();

    const now = DateTime.now().setZone(tz);
    const today = now.toISODate(); // "YYYY-MM-DD"
    const weekday = now.weekday; // 1..7 (MON..SUN)
    const nowHHmm = now.toFormat('HH:mm');

    // 1) overrides imaju prioritet
    const ov = await this.overrideRepo
      .createQueryBuilder('o')
      .where('o.dateFrom <= :d AND o.dateTo >= :d', { d: today })
      .orderBy('o.createdAt', 'DESC')
      .getOne();

    if (ov) {
      if (ov.isClosed) {
        throw new BadRequestException(
          ov.reason
            ? `Restaurant is closed: ${ov.reason}`
            : 'Restaurant is closed.',
        );
      }

      // open by override hours (ako su definisani)
      if (ov.openTime && ov.closeTime) {
        if (!this.isTimeWithinWindow(nowHHmm, ov.openTime, ov.closeTime)) {
          throw new BadRequestException('Restaurant is currently closed.');
        }
        return;
      }
      // if override says open but no hours, fallback to weekly
    }

    // 2) weekly hours
    const wh = await this.whRepo.findOne({
      where: { weekday: weekday as any },
    });

    if (!wh || wh.isClosed || !wh.openTime || !wh.closeTime) {
      throw new BadRequestException('Restaurant is currently closed.');
    }

    if (!this.isTimeWithinWindow(nowHHmm, wh.openTime, wh.closeTime)) {
      throw new BadRequestException('Restaurant is currently closed.');
    }
  }

  // ===== Delivery eligibility (1:1 with frontend) =====

  private isPizzaSlug(slug: string) {
    return slug.startsWith('pizza-');
  }
  private isSandwichSlug(slug: string) {
    return slug.startsWith('sandwich-');
  }
  private isDrinkSlug(slug: string) {
    return slug.startsWith('drink-');
  }

  private isPizzaSmall(slug: string, size?: number | null) {
    return this.isPizzaSlug(slug) && Number(size) === 24;
  }

  private isPizzaDeliveryAllowed(slug: string, size?: number | null) {
    return (
      this.isPizzaSlug(slug) && (Number(size) === 32 || Number(size) === 50)
    );
  }

  private getDeliveryEligibilityFromVariants(
    variants: ProductVariant[],
    mergedQty: Map<string, number>,
  ): {
    allowed: boolean;
    reason: DeliveryReason;
    flags: {
      hasAllowedPizza: boolean;
      hasForbiddenItems: boolean;
      hasOnlyDrinks: boolean;
    };
  } {
    const items = variants
      .map((v) => ({
        slug: String((v as any).product?.slug ?? ''),
        size: (v as any).size ?? null,
        quantity: mergedQty.get(v.id) ?? 0,
      }))
      .filter((i) => i.quantity > 0);

    const hasAnyItems = items.length > 0;

    const hasAllowedPizza = items.some((i) =>
      this.isPizzaDeliveryAllowed(i.slug, i.size),
    );

    const hasForbiddenItems = items.some((i) => {
      return this.isPizzaSmall(i.slug, i.size) || this.isSandwichSlug(i.slug);
    });

    const hasOnlyDrinks =
      hasAnyItems && items.every((i) => this.isDrinkSlug(i.slug));

    const allowed = hasAllowedPizza && !hasForbiddenItems && !hasOnlyDrinks;

    let reason: DeliveryReason = null;
    if (!hasAnyItems) reason = 'empty';
    else if (hasOnlyDrinks) reason = 'onlyDrinks';
    else if (!hasAllowedPizza) reason = 'needLargePizza';
    else if (hasForbiddenItems) reason = 'forbiddenItems';

    return {
      allowed,
      reason,
      flags: { hasAllowedPizza, hasForbiddenItems, hasOnlyDrinks },
    };
  }
}
