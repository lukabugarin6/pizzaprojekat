import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('webauthn_credentials')
export class WebAuthnCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (u) => u.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // base64url string
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 512 })
  credentialId!: string;

  // base64url public key (može TEXT)
  @Column({ type: 'text' })
  publicKey!: string;

  @Column({ type: 'int', default: 0 })
  counter!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType!: string | null;

  @Column({ type: 'boolean', nullable: true })
  backedUp!: boolean | null;

  @CreateDateColumn()
  createdAt!: Date;
}
