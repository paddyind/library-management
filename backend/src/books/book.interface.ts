export enum BookStatus {
  NEW = 'New',
  AVAILABLE = 'Available',
  BORROWED = 'Borrowed',
  RESERVED = 'Reserved',
  DAMAGED = 'Damaged',
  ONSALE = 'OnSale',
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  owner_id: string;
  /** Total copies owned by the library */
  count: number;
  status: BookStatus | string; // Allow string for custom statuses like 'with_me'
  forSale: boolean;
  price?: number;
  isAvailable?: boolean; // Optional: indicates if book is available for borrowing
  borrowedByMe?: boolean; // Optional: indicates if current user has borrowed this book
  /** Copies currently on loan (active / pending return) */
  onLoanCount?: number;
  /** Copies still available to borrow (count - onLoanCount) */
  availableCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
