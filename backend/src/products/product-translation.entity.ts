// src/products/product-translation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Language } from '../common/enums/language.enum';

@Entity('product_translations')
@Unique(['product', 'language'])
export class ProductTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Language })
  language: Language;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Product, (p) => p.translations, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
