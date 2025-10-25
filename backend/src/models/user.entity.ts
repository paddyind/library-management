import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Book } from './book.entity';
import { Loan } from './loan.entity';
import { Group } from './group.entity';
import { Reservation } from './reservation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column('simple-json', { nullable: true })
  notificationPreferences: { email?: boolean; sms?: boolean };

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Book, book => book.owner)
  books: Book[];

  @OneToMany(() => Loan, loan => loan.borrower)
  borrowedBooks: Loan[];

  @ManyToMany(() => Group, group => group.users)
  @JoinTable()
  groups: Group[];

  @OneToMany(() => Reservation, reservation => reservation.user)
  reservations: Reservation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
