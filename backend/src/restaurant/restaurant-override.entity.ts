// src/restaurant/restaurant-override.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
} from 'typeorm';
import { RestaurantSettings } from './restaurant-settings.entity';

@Entity('restaurant_overrides')
export class RestaurantOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RestaurantSettings, { onDelete: 'CASCADE' })
  settings: RestaurantSettings;

  // Range (inclusive). For single day: dateFrom = dateTo
  @Index()
  @Column({ type: 'date' })
  dateFrom: string; // "YYYY-MM-DD"

  @Index()
  @Column({ type: 'date' })
  dateTo: string; // "YYYY-MM-DD"

  // If true -> closed no matter what weekly says
  @Column({ type: 'boolean', default: true })
  isClosed: boolean;

  // If isClosed=false, you can optionally set special hours
  @Column({ type: 'varchar', length: 5, nullable: true })
  openTime: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  closeTime: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
