import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Member } from '../members/member.interface';

export const GetMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Member => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
