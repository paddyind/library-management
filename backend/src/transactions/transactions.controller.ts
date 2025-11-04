import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole, Member } from '../members/member.interface';
import { TransactionsService } from './transactions.service';
import type { Request } from 'express';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Get all transactions', description: 'Retrieve all transactions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get('my-transactions')
  @ApiOperation({ summary: 'Get my transactions', description: 'Retrieve transactions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyTransactions(@Req() req: Request) {
    const member = req.user as Member;
    return this.transactionsService.findMemberTransactions(member.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new transaction', description: 'Create a new transaction (e.g., buy a book)' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTransactionDto: CreateTransactionDto, @Req() req: Request) {
    const member = req.user as Member;
    return this.transactionsService.create(createTransactionDto, member.id);
  }
}
