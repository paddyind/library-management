export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  owner_id: string;
  status?: string; // Book availability status: 'available', 'borrowed', 'reserved'
  createdAt: Date;
  updatedAt: Date;
}
