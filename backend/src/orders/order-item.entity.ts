import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  order: Order;

  // reference radi analitike (uuid kao string)
  @Index()
  @Column({ type: 'uuid' })
  productId: string;

  @Index()
  @Column({ type: 'uuid' })
  variantId: string;

  // snapshot (da se ne menja retroaktivno)
  @Column({ type: 'varchar', length: 200 })
  productName: string;

  @Column({ type: 'int', nullable: true })
  variantSize: number | null;

  @Column({ type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  lineTotal: number;
}
