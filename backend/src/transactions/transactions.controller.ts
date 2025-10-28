import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole, Member } from '../models/member.entity';
import { TransactionsService } from './transactions.service';
import type { Request } from 'express';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(MemberRole.ADMIN)
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get('my-transactions')
  findMyTransactions(@Req() req: Request) {
    const member = req.user as Member;
    return this.transactionsService.findMemberTransactions(member.id);
  }
}
