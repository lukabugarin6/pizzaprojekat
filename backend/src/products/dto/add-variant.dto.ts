import { IsOptional, IsNumber } from 'class-validator';

export class AddProductVariantDto {
  @IsOptional()
  @IsNumber()
  size?: number;

  @IsNumber()
  price: number;
}
