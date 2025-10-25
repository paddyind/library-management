import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Book, book => book.loans)
  book: Book;

  @ManyToOne(() => User, user => user.borrowedBooks)
  borrower: User;

  @Column()
  issueDate: Date;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  returnDate: Date;

  @Column({ default: 0 })
  fineAmount: number;

  @Column({ default: false })
  isReturned: boolean;

  @Column({ default: false })
  isNotified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
