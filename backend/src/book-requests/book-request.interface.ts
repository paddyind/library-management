import { Member } from '../members/member.interface';

export interface BookRequest {
  id: string;
  title: string;
  author: string;
  member: Member;
  createdAt: Date;
  updatedAt: Date;
}
