import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '../models/member.entity';

export const Roles = (...roles: MemberRole[]) => SetMetadata('roles', roles);
