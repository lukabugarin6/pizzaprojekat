// src/restaurant/dto/set-weekly-hours.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Weekday } from '../restaurant-working-hours.entity';

export class WeeklyHoursItemDto {
  @IsEnum(Weekday)
  weekday: Weekday; // 1..7

  @IsBoolean()
  isClosed: boolean;

  // "HH:mm"
  @IsOptional()
  @IsString()
  @Length(5, 5)
  openTime?: string | null;

  @IsOptional()
  @IsString()
  @Length(5, 5)
  closeTime?: string | null;
}

export class SetWeeklyHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursItemDto)
  items: WeeklyHoursItemDto[];
}
