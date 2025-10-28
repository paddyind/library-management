import { Book } from '../books/book.interface';
import { Member } from '../members/member.interface';

export interface Loan {
  id: number;
  borrower: Member;
  book: Book;
  loanDate: Date;
  returnDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
