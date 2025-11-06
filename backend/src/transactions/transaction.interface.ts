export enum TransactionType {
  BORROW = 'borrow',
  RETURN = 'return',
  RESERVE = 'reserve',
  CANCEL = 'cancel',
  BUY = 'buy',
}

export interface Transaction {
  id: string;
  bookId: string;
  memberId: string;
  type: TransactionType;
  status?: string;
  borrowedDate?: Date;
  dueDate?: Date;
  returnDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
