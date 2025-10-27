import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Book } from './book.entity';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Member, member => member.reservations)
  member: Member;

  @ManyToOne(() => Book, book => book.reservations)
  book: Book;

  @CreateDateColumn()
  reservedAt: Date;

  @Column()
  status: string; // e.g., 'reserved', 'cancelled', 'completed'
}
