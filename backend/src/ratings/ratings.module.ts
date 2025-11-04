import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { SupabaseService } from '../config/supabase.service';

@Module({
  controllers: [RatingsController],
  providers: [RatingsService, SupabaseService],
})
export class RatingsModule {}
