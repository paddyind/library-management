import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '../dto/review.dto';
import { Review } from './review.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole, Member } from '../members/member.interface';
import type { Request } from 'express';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new review', description: 'Add a new review to a book (requires authentication). Only allowed after returning the book.' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input - book must be returned first' })
  create(@Body() createReviewDto: CreateReviewDto, @Req() req: Request): Promise<Review> {
    const member = req.user as Member;
    return this.reviewsService.create(createReviewDto, member.id);
  }

  @Get('book/:bookId')
  @ApiOperation({ summary: 'Get all reviews for a book', description: 'Retrieve all approved reviews for a specific book (public access)' })
  @ApiResponse({ status: 200, description: 'List of reviews retrieved successfully' })
  findAllForBook(@Param('bookId') bookId: string): Promise<Review[]> {
    return this.reviewsService.findAllForBook(bookId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending reviews', description: 'Get all pending reviews awaiting approval (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending reviews' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findPending(): Promise<Review[]> {
    return this.reviewsService.findPending();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a review', description: 'Approve a pending review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Review approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Review not found or already processed' })
  approve(@Param('id') reviewId: string, @Req() req: Request): Promise<Review> {
    const admin = req.user as Member;
    return this.reviewsService.approve(reviewId, admin.id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a review', description: 'Reject a pending review with a reason (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
  @ApiResponse({ status: 200, description: 'Review rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Review not found or already processed' })
  reject(@Param('id') reviewId: string, @Body() body: { reason: string }, @Req() req: Request): Promise<Review> {
    const admin = req.user as Member;
    return this.reviewsService.reject(reviewId, admin.id, body.reason);
  }
}
