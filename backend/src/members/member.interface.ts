export enum MemberRole {
  ADMIN = 'admin',
  LIBRARIAN = 'librarian',
  MEMBER = 'member',
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}
