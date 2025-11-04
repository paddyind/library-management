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
  status: BookStatus;
  forSale: boolean;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}
