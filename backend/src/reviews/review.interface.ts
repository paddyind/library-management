export interface Review {
  id: string;
  bookId: string;
  memberId: string;
  review: string;
  createdAt: Date;
  updatedAt: Date;
}
