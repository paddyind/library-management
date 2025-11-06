import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';

@Module({
  imports: [SupabaseModule, SqliteModule],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
