import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Loan } from './loan.entity';

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

  @ManyToOne(() => User, user => user.books)
  owner: User;

  @OneToMany(() => Loan, loan => loan.book)
  loans: Loan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
