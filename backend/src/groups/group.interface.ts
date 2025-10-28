import { Member } from '../members/member.interface';

export interface Group {
  id: number;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
  updatedAt: Date;
}
