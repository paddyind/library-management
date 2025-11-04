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
  createdAt: Date;
  updatedAt: Date;
}
