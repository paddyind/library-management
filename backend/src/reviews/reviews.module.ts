import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../config/email.module';
import { MembersModule } from '../members/members.module';
import { BooksModule } from '../books/books.module';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
  imports: [SupabaseModule, SqliteModule, AuthModule, EmailModule, MembersModule, BooksModule, RatingsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
