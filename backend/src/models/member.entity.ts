import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Book } from './book.entity';
import { Loan } from './loan.entity';
import { Group } from './group.entity';
import { Reservation } from './reservation.entity';
import { Subscription } from './subscription.entity';
import { BookRequest } from './book-request.entity';

export enum MemberRole {
  ADMIN = 'Admin',
  MEMBER = 'Member',
}

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column('simple-json', { nullable: true })
  notificationPreferences: { email?: boolean; sms?: boolean };

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({
    type: 'simple-enum',
    enum: MemberRole,
    default: MemberRole.MEMBER,
  })
  role: MemberRole;

  @OneToMany(() => Book, book => book.owner)
  books: Book[];

  @OneToMany(() => Loan, loan => loan.borrower)
  borrowedBooks: Loan[];

  @ManyToMany(() => Group, group => group.members)
  @JoinTable()
  groups: Group[];

  @OneToMany(() => Reservation, reservation => reservation.member)
  reservations: Reservation[];

  @OneToMany(() => Subscription, subscription => subscription.member)
  subscriptions: Subscription[];

  @OneToMany(() => BookRequest, bookRequest => bookRequest.requestedBy)
  bookRequests: BookRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
