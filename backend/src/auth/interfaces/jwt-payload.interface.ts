import { MemberRole } from '../../members/member.interface';

export interface JwtPayload {
  email: string;
  sub: string;
  role: MemberRole;
}
