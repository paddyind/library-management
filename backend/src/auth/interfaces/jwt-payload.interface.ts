import { UserRole } from '../../models/user.entity';

export interface JwtPayload {
  email: string;
  sub: string;
  role: UserRole;
}
