import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WebAuthnCredential } from './webauthn-credential.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  // poslednji challenge (kratko traje)
  @Column({ type: 'varchar', length: 255, nullable: true })
  webauthnChallenge!: string | null;

  @Column({ type: 'datetime', nullable: true })
  challengeExpiresAt!: Date | null;

  @OneToMany(() => WebAuthnCredential, (c) => c.user, { cascade: false })
  credentials!: WebAuthnCredential[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
