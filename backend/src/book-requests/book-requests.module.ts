import { Module } from '@nestjs/common';
import { BookRequestsController } from './book-requests.controller';
import { BookRequestsService } from './book-requests.service';
import { SupabaseModule } from '../config/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [SupabaseModule, AuthModule, MembersModule],
  controllers: [BookRequestsController],
  providers: [BookRequestsService],
})
export class BookRequestsModule {}
