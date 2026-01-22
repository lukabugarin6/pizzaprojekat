// src/products/product-variant.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', nullable: true })
  size: number | null; // 24, 32, 50 | null

  @Column()
  price: number;

  @ManyToOne(() => Product, (p) => p.variants, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
