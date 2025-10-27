import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Member } from './member.entity';

export enum SubscriptionTier {
  FREE = 'FREE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Member, member => member.subscriptions)
  member: Member;

  @Column({
    type: 'simple-enum',
    enum: SubscriptionTier,
  })
  tier: SubscriptionTier;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  depositAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
