export interface Rating {
  id: string;
  bookId: string;
  memberId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}
