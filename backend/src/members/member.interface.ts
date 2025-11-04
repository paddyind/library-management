export enum MemberRole {
  ADMIN = 'admin',
  LIBRARIAN = 'librarian',
  MEMBER = 'member',
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address: string;
  preferences?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}
