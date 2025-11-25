import { Controller, Get, Post, Patch, Body, UseGuards, Req, Param } from '@nestjs/common';
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
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get all transactions', description: 'Retrieve all transactions (Admin and Librarian only). Can filter by bookId query param.' })
  @ApiResponse({ status: 200, description: 'List of all transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Librarian role required' })
  findAll(@Req() req: Request) {
    const bookId = req.query.bookId as string | undefined;
    return this.transactionsService.findAll(bookId);
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
  @ApiOperation({ summary: 'Create a new transaction', description: 'Create a new transaction (e.g., borrow a book)' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTransactionDto: CreateTransactionDto, @Req() req: Request) {
    const member = req.user as Member;
    // Pass user data to ensure user exists in both databases
    return this.transactionsService.create(createTransactionDto, member.id, {
      email: member.email,
      name: member.name,
      role: member.role,
    });
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Return a borrowed book', description: 'Mark a transaction as returned and update book status' })
  @ApiResponse({ status: 200, description: 'Book returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  returnBook(@Param('id') transactionId: string, @Req() req: Request) {
    const member = req.user as Member;
    return this.transactionsService.return(transactionId, member.id);
  }

  @Patch(':id/renew')
  @ApiOperation({ summary: 'Renew a borrowed book', description: 'Extend the due date for a borrowed book by 14 days' })
  @ApiResponse({ status: 200, description: 'Book renewed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  renewBook(@Param('id') transactionId: string, @Req() req: Request) {
    const member = req.user as Member;
    return this.transactionsService.renew(transactionId, member.id);
  }

  @Patch(':id/approve-return')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Approve a pending return request', description: 'Approve a return request and mark transaction as completed (Admin/Librarian only)' })
  @ApiResponse({ status: 200, description: 'Return approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Librarian role required' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  approveReturn(@Param('id') transactionId: string, @Req() req: Request) {
    const approver = req.user as Member;
    return this.transactionsService.approveReturn(transactionId, approver.id);
  }

  @Patch(':id/reject-return')
  @UseGuards(RolesGuard)
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Reject a pending return request', description: 'Reject a return request and change status back to active (Admin/Librarian only)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: [] } })
  @ApiResponse({ status: 200, description: 'Return rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Librarian role required' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  rejectReturn(@Param('id') transactionId: string, @Body() body: { reason?: string }, @Req() req: Request) {
    const approver = req.user as Member;
    return this.transactionsService.rejectReturn(transactionId, approver.id, body.reason);
  }
}
