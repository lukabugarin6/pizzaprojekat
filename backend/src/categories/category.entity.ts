// src/categories/category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CategoryTranslation } from './category-translation.entity';
import { Product } from '../products/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string; // pizza, sandwich, drink

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => CategoryTranslation, (t) => t.category, {
    cascade: true,
  })
  translations: CategoryTranslation[];

  @OneToMany(() => Product, (p) => p.category)
  products: Product[];
}
