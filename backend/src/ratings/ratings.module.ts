import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../config/email.module';
import { MembersModule } from '../members/members.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [SupabaseModule, SqliteModule, AuthModule, EmailModule, MembersModule, BooksModule],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
