import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { OrderStatus } from './order-status.enum';
import { OrderType } from './order-type.enum';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // kratak kod za web praćenje
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 12 })
  publicCode: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  accessToken: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  // najjednostavnije: jedan tekst
  @Column({ type: 'text', nullable: true })
  addressText: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // setuje se na accept
  @Column({ type: 'int', nullable: true })
  etaMinutes: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  // ko je obradio
  @ManyToOne(() => User, { nullable: true })
  handledBy: User | null;

  @Column({ type: 'datetime', nullable: true })
  handledAt: Date | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'int', default: 0 })
  total: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
