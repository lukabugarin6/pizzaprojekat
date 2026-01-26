// src/restaurant/restaurant-working-hours.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  Unique,
} from 'typeorm';
import { RestaurantSettings } from './restaurant-settings.entity';

export enum Weekday {
  MON = 1,
  TUE = 2,
  WED = 3,
  THU = 4,
  FRI = 5,
  SAT = 6,
  SUN = 7,
}

@Entity('restaurant_working_hours')
@Unique(['settings', 'weekday'])
export class RestaurantWorkingHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RestaurantSettings, { onDelete: 'CASCADE' })
  settings: RestaurantSettings;

  @Index()
  @Column({ type: 'tinyint' }) // MySQL: tinyint; Postgres can be smallint
  weekday: Weekday;

  // If closed that day
  @Column({ type: 'boolean', default: false })
  isClosed: boolean;

  // Store as "HH:mm" (simple + portable)
  @Column({ type: 'varchar', length: 5, nullable: true })
  openTime: string | null; // e.g. "15:00"

  @Column({ type: 'varchar', length: 5, nullable: true })
  closeTime: string | null; // e.g. "23:00"
}
