import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating } from './rating.interface';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { Request } from 'express';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new rating', description: 'Add a new rating to a book (requires authentication)' })
  @ApiBody({ type: CreateRatingDto })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createRatingDto: CreateRatingDto, @Req() req: Request): Promise<Rating> {
    const userId = (req as any).user.id;
    return this.ratingsService.create(createRatingDto, userId);
  }

  @Get('book/:bookId/average')
  @ApiOperation({ summary: 'Get average rating for a book', description: 'Retrieve the average rating for a specific book (public access)' })
  @ApiResponse({ status: 200, description: 'Average rating retrieved successfully' })
  findAverageForBook(@Param('bookId') bookId: string): Promise<number> {
    return this.ratingsService.findAverageForBook(bookId);
  }
}
