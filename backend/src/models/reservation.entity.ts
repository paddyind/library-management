import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.reservations)
  user: User;

  @ManyToOne(() => Book, book => book.reservations)
  book: Book;

  @CreateDateColumn()
  reservedAt: Date;

  @Column()
  status: string; // e.g., 'reserved', 'cancelled', 'completed'
}
