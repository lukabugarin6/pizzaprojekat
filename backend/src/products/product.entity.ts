// src/products/product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { ProductTranslation } from './product-translation.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  image: string | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Category, (c) => c.products)
  category: Category;

  @OneToMany(() => ProductTranslation, (t) => t.product, {
    cascade: true,
  })
  translations: ProductTranslation[];

  @OneToMany(() => ProductVariant, (v) => v.product, {
    cascade: true,
  })
  variants: ProductVariant[];
}
