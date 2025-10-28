import { Book } from '../books/book.interface';
import { Member } from '../members/member.interface';

export interface Reservation {
  id: number;
  member: Member;
  book: Book;
  status: 'reserved' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
