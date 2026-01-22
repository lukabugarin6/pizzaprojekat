// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductTranslation } from './product-translation.entity';
import { ProductVariant } from './product-variant.entity';
import { Category } from '../categories/category.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductTranslation,
      ProductVariant,
      Category,
    ]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
