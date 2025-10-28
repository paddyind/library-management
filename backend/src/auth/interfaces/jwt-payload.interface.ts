import { MemberRole } from '../../models/member.entity';

export interface JwtPayload {
  email: string;
  sub: string;
  role: MemberRole;
}
