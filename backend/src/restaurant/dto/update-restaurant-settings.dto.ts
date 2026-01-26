// src/restaurant/dto/update-restaurant-settings.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRestaurantSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string; // e.g. "Europe/Belgrade"
}
