export type RatingStatus = 'pending' | 'approved' | 'rejected';

export interface Rating {
  id: string;
  bookId: string;
  memberId: string;
  transactionId?: string;
  rating: number;
  status: RatingStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
