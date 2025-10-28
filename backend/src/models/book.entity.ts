import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Member } from './member.entity';
import { Loan } from './loan.entity';
import { Reservation } from './reservation.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  isbn: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  genre: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 'available' })
  status: 'available' | 'lent' | 'unavailable';

  @ManyToOne(() => Member, member => member.books)
  owner: Member;

  @OneToMany(() => Loan, loan => loan.book)
  loans: Loan[];

  @OneToMany(() => Reservation, reservation => reservation.book)
  reservations: Reservation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
