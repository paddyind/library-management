export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  bookId: string;
  memberId: string;
  transactionId?: string;
  review: string;
  status: ReviewStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
