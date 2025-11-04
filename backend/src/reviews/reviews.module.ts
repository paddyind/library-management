import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SupabaseService } from '../config/supabase.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, SupabaseService],
})
export class ReviewsModule {}
