// src/products/dto/create-product.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Language } from '../../common/enums/language.enum';

export class CreateProductTranslationDto {
  @IsEnum(Language)
  language: Language;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateProductVariantDto {
  @IsOptional()
  @IsNumber()
  size?: number;

  @IsNumber()
  price: number;

  // opcionalno: sku ako ti treba (za pizze ti je korisno)
  @IsOptional()
  @IsString()
  sku?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  image?: string | null;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductTranslationDto)
  translations?: CreateProductTranslationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
