// src/restaurant/restaurant-settings.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('restaurant_settings')
export class RestaurantSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, default: 'My Restaurant' })
  name: string;

  // Optional but very useful for “is open now?” logic
  @Column({ type: 'varchar', length: 60, default: 'Europe/Belgrade' })
  timezone: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
