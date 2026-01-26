// src/restaurant/dto/create-override.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateOverrideDto {
  // "YYYY-MM-DD"
  @IsString()
  @Length(10, 10)
  dateFrom: string;

  @IsString()
  @Length(10, 10)
  dateTo: string;

  @IsBoolean()
  isClosed: boolean;

  // only relevant if isClosed=false (special hours)
  @IsOptional()
  @IsString()
  @Length(5, 5)
  openTime?: string | null;

  @IsOptional()
  @IsString()
  @Length(5, 5)
  closeTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string | null;
}
