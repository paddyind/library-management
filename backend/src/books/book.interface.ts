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
  count: number;
  status: BookStatus | string; // Allow string for custom statuses like 'with_me'
  forSale: boolean;
  price?: number;
  isAvailable?: boolean; // Optional: indicates if book is available for borrowing
  borrowedByMe?: boolean; // Optional: indicates if current user has borrowed this book
  createdAt: Date;
  updatedAt: Date;
}
