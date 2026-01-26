// src/restaurant/restaurant.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { RestaurantSettings } from './restaurant-settings.entity';
import {
  RestaurantWorkingHours,
  Weekday,
} from './restaurant-working-hours.entity';
import { RestaurantOverride } from './restaurant-override.entity';

type EffectiveHours = {
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  source: 'override' | 'weekly';
  reason?: string | null;
};

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(RestaurantSettings)
    private settingsRepo: Repository<RestaurantSettings>,
    @InjectRepository(RestaurantWorkingHours)
    private hoursRepo: Repository<RestaurantWorkingHours>,
    @InjectRepository(RestaurantOverride)
    private overrideRepo: Repository<RestaurantOverride>,
  ) {}

  async getOrCreateSettings(): Promise<RestaurantSettings> {
    const existing = await this.settingsRepo.findOne({ where: {} });
    if (existing) return existing;

    const created = this.settingsRepo.create({
      name: 'My Restaurant',
      timezone: 'Europe/Belgrade',
    });
    return this.settingsRepo.save(created);
  }

  async getWeeklyHours(settingsId: string) {
    return this.hoursRepo.find({
      where: { settings: { id: settingsId } as any },
      order: { weekday: 'ASC' as any },
    });
  }

  async getActiveOverride(settingsId: string, dateISO: string) {
    // dateISO: "YYYY-MM-DD"
    return this.overrideRepo.findOne({
      where: {
        settings: { id: settingsId } as any,
        dateFrom: Between('0000-01-01', dateISO) as any, // not used, see below
      } as any,
    });
  }

  async findOverrideForDate(settingsId: string, dateISO: string) {
    // Proper query: dateFrom <= dateISO AND dateTo >= dateISO
    return this.overrideRepo
      .createQueryBuilder('o')
      .where('o.settingsId = :settingsId', { settingsId })
      .andWhere('o.dateFrom <= :d', { d: dateISO })
      .andWhere('o.dateTo >= :d', { d: dateISO })
      .orderBy('o.createdAt', 'DESC')
      .getOne();
  }

  private weekdayFromDate(date: Date): Weekday {
    // JS getDay(): Sun=0..Sat=6  -> we want Mon=1..Sun=7
    const d = date.getDay();
    return (d === 0 ? 7 : d) as Weekday;
  }

  private toHHmm(date: Date, tz: string): string {
    // Minimal dependency-free approach:
    // Uses Intl to format in timezone
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${hh}:${mm}`;
  }

  private toDateISO(date: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  }

  private isWithin(
    openTime: string,
    closeTime: string,
    nowHHmm: string,
  ): boolean {
    // Assumes same-day window and closeTime > openTime (e.g. 15:00-23:00)
    // If you ever need overnight (e.g. 18:00-02:00), we can extend this.
    return nowHHmm >= openTime && nowHHmm <= closeTime;
  }

  async getEffectiveHoursForToday(): Promise<{
    settings: RestaurantSettings;
    date: string;
    now: string;
    effective: EffectiveHours;
    isOpenNow: boolean;
    weekly: RestaurantWorkingHours[];
    activeOverride: RestaurantOverride | null;
  }> {
    const settings = await this.getOrCreateSettings();

    const now = new Date();
    const tz = settings.timezone;

    const dateISO = this.toDateISO(now, tz);
    const nowHHmm = this.toHHmm(now, tz);

    const weekly = await this.getWeeklyHours(settings.id);
    const todayWeekday = this.weekdayFromDate(
      new Date(new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(now)),
    );

    const todayWeekly = weekly.find((w) => w.weekday === todayWeekday) ?? null;

    const activeOverride = await this.findOverrideForDate(settings.id, dateISO);

    let effective: EffectiveHours;

    if (activeOverride) {
      effective = {
        isClosed: activeOverride.isClosed,
        openTime: activeOverride.openTime ?? null,
        closeTime: activeOverride.closeTime ?? null,
        source: 'override',
        reason: activeOverride.reason ?? null,
      };
    } else if (todayWeekly) {
      effective = {
        isClosed: todayWeekly.isClosed,
        openTime: todayWeekly.openTime ?? null,
        closeTime: todayWeekly.closeTime ?? null,
        source: 'weekly',
      };
    } else {
      effective = {
        isClosed: true,
        openTime: null,
        closeTime: null,
        source: 'weekly',
      };
    }

    const isOpenNow =
      !effective.isClosed &&
      !!effective.openTime &&
      !!effective.closeTime &&
      this.isWithin(effective.openTime, effective.closeTime, nowHHmm);

    return {
      settings,
      date: dateISO,
      now: nowHHmm,
      effective,
      isOpenNow,
      weekly,
      activeOverride: activeOverride ?? null,
    };
  }
}
