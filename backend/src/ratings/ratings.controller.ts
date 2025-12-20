import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating } from './rating.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole, Member } from '../members/member.interface';
import type { Request } from 'express';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new rating', description: 'Add a new rating to a book (requires authentication). Only allowed after returning the book.' })
  @ApiBody({ type: CreateRatingDto })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input - book must be returned first' })
  create(@Body() createRatingDto: CreateRatingDto, @Req() req: Request): Promise<Rating> {
    const member = req.user as Member;
    return this.ratingsService.create(createRatingDto, member.id);
  }

  @Get('book/:bookId/average')
  @ApiOperation({ summary: 'Get average rating for a book', description: 'Retrieve the average rating for a specific book (public access, only approved ratings)' })
  @ApiResponse({ status: 200, description: 'Average rating retrieved successfully' })
  findAverageForBook(@Param('bookId') bookId: string): Promise<number> {
    return this.ratingsService.findAverageForBook(bookId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending ratings', description: 'Get all pending ratings awaiting approval (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending ratings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findPending(): Promise<Rating[]> {
    return this.ratingsService.findPending();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a rating', description: 'Approve a pending rating (Admin only)' })
  @ApiResponse({ status: 200, description: 'Rating approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Rating not found or already processed' })
  approve(@Param('id') ratingId: string, @Req() req: Request): Promise<Rating> {
    const admin = req.user as Member;
    return this.ratingsService.approve(ratingId, admin.id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a rating', description: 'Reject a pending rating with a reason (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
  @ApiResponse({ status: 200, description: 'Rating rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Rating not found or already processed' })
  reject(@Param('id') ratingId: string, @Body() body: { reason: string }, @Req() req: Request): Promise<Rating> {
    const admin = req.user as Member;
    return this.ratingsService.reject(ratingId, admin.id, body.reason);
  }
}
