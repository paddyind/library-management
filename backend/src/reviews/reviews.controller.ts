import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '../dto/review.dto';
import { Review } from './review.interface';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { Request } from 'express';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new review', description: 'Add a new review to a book (requires authentication)' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createReviewDto: CreateReviewDto, @Req() req: Request): Promise<Review> {
    const userId = (req as any).user.id;
    return this.reviewsService.create(createReviewDto, userId);
  }

  @Get('book/:bookId')
  @ApiOperation({ summary: 'Get all reviews for a book', description: 'Retrieve all reviews for a specific book (public access)' })
  @ApiResponse({ status: 200, description: 'List of reviews retrieved successfully' })
  findAllForBook(@Param('bookId') bookId: string): Promise<Review[]> {
    return this.reviewsService.findAllForBook(bookId);
  }
}
