// src/categories/category-translation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Category } from './category.entity';
import { Language } from '../common/enums/language.enum';

@Entity('category_translations')
@Unique(['category', 'language'])
export class CategoryTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Language })
  language: Language;

  @Column()
  name: string;

  @ManyToOne(() => Category, (c) => c.translations, {
    onDelete: 'CASCADE',
  })
  category: Category;
}
