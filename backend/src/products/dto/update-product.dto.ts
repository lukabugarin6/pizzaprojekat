// src/products/dto/update-product.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Language } from '../../common/enums/language.enum';

export class UpdateProductTranslationDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(Language)
  language: Language;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdateProductVariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsNumber()
  size?: number | null;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ✅ NEW
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  /**
   * ✅ signal za delete slike:
   * - ako u data pošalješ: { "image": null } => controller prosledi imageUrl = null
   * - inače ignorišeš
   */
  @IsOptional()
  image?: null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductTranslationDto)
  translations?: UpdateProductTranslationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[];
}
