// src/restaurant/restaurant-admin.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RestaurantSettings } from './restaurant-settings.entity';
import {
  RestaurantWorkingHours,
  Weekday,
} from './restaurant-working-hours.entity';
import { RestaurantOverride } from './restaurant-override.entity';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';
import { SetWeeklyHoursDto } from './dto/set-weekly-hours.dto';
import { CreateOverrideDto } from './dto/create-override.dto';

@Injectable()
export class RestaurantAdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RestaurantSettings)
    private settingsRepo: Repository<RestaurantSettings>,
    @InjectRepository(RestaurantWorkingHours)
    private hoursRepo: Repository<RestaurantWorkingHours>,
    @InjectRepository(RestaurantOverride)
    private overrideRepo: Repository<RestaurantOverride>,
  ) {}

  private async getOrCreateSettings(): Promise<RestaurantSettings> {
    const existing = await this.settingsRepo.findOne({ where: {} });
    if (existing) return existing;

    const created = this.settingsRepo.create({
      name: 'My Restaurant',
      timezone: 'Europe/Belgrade',
    });
    return this.settingsRepo.save(created);
  }

  async updateSettings(dto: UpdateRestaurantSettingsDto) {
    const settings = await this.getOrCreateSettings();

    if (dto.timezone) {
      // quick sanity check: Intl throws on invalid tz in many runtimes
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format(
          new Date(),
        );
      } catch {
        throw new BadRequestException({
          code: 'INVALID_TIMEZONE',
          message: 'Invalid timezone.',
        });
      }
    }

    Object.assign(settings, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
    });

    const saved = await this.settingsRepo.save(settings);
    return { settings: saved };
  }

  async setWeeklyHours(dto: SetWeeklyHoursDto) {
    // Must include all 7 days
    const weekdays = new Set(dto.items.map((i) => i.weekday));
    for (const d of [1, 2, 3, 4, 5, 6, 7] as Weekday[]) {
      if (!weekdays.has(d)) {
        throw new BadRequestException({
          code: 'MISSING_WEEKDAY',
          message: `Missing weekday ${d}. You must send all 7 days.`,
        });
      }
    }

    // Validate times when not closed
    for (const item of dto.items) {
      if (item.isClosed) continue;

      if (!item.openTime || !item.closeTime) {
        throw new BadRequestException({
          code: 'INVALID_HOURS',
          message: `weekday ${item.weekday}: openTime and closeTime are required when isClosed=false`,
        });
      }

      if (item.openTime >= item.closeTime) {
        throw new BadRequestException({
          code: 'INVALID_HOURS_RANGE',
          message: `weekday ${item.weekday}: closeTime must be after openTime`,
        });
      }
    }

    const settings = await this.getOrCreateSettings();

    // Upsert all 7 in a transaction
    await this.dataSource.transaction(async (tx) => {
      const txRepo = tx.getRepository(RestaurantWorkingHours);

      // load existing
      const existing = await txRepo.find({
        where: { settings: { id: settings.id } as any },
      });

      const byDay = new Map(existing.map((e) => [e.weekday, e]));

      const toSave = dto.items.map((i) => {
        const row =
          byDay.get(i.weekday) ??
          txRepo.create({ settings, weekday: i.weekday });

        row.isClosed = i.isClosed;

        if (i.isClosed) {
          row.openTime = null;
          row.closeTime = null;
        } else {
          row.openTime = i.openTime ?? null;
          row.closeTime = i.closeTime ?? null;
        }

        return row;
      });

      await txRepo.save(toSave);
    });

    const weekly = await this.hoursRepo.find({
      where: { settings: { id: settings.id } as any },
      order: { weekday: 'ASC' as any },
    });

    return { settingsId: settings.id, weekly };
  }

  async createOverride(dto: CreateOverrideDto) {
    const settings = await this.getOrCreateSettings();

    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'dateFrom must be <= dateTo',
      });
    }

    if (!dto.isClosed) {
      // special open hours override
      if (!dto.openTime || !dto.closeTime) {
        throw new BadRequestException({
          code: 'INVALID_OVERRIDE_HOURS',
          message: 'openTime and closeTime are required when isClosed=false',
        });
      }
      if (dto.openTime >= dto.closeTime) {
        throw new BadRequestException({
          code: 'INVALID_OVERRIDE_HOURS_RANGE',
          message: 'closeTime must be after openTime',
        });
      }
    }

    // Optional: prevent overlapping overrides (recommended)
    const overlap = await this.overrideRepo
      .createQueryBuilder('o')
      .where('o.settingsId = :settingsId', { settingsId: settings.id })
      .andWhere('o.dateFrom <= :to', { to: dto.dateTo })
      .andWhere('o.dateTo >= :from', { from: dto.dateFrom })
      .getOne();

    if (overlap) {
      throw new BadRequestException({
        code: 'OVERRIDE_OVERLAP',
        message:
          'Override overlaps an existing override. Delete or adjust the existing one first.',
        existingOverrideId: overlap.id,
      });
    }

    const entity = this.overrideRepo.create({
      settings,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      isClosed: dto.isClosed,
      openTime: dto.isClosed ? null : (dto.openTime ?? null),
      closeTime: dto.isClosed ? null : (dto.closeTime ?? null),
      reason: dto.reason ?? null,
    });

    const saved = await this.overrideRepo.save(entity);
    return { override: saved };
  }

  async deleteOverride(id: string) {
    const found = await this.overrideRepo.findOne({ where: { id } });
    if (!found)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Override not found',
      });

    await this.overrideRepo.delete(id);
    return { ok: true };
  }
}
