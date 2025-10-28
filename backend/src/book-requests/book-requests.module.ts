import { Module } from '@nestjs/common';
import { BookRequestsController } from './book-requests.controller';
import { BookRequestsService } from './book-requests.service';
import { SupabaseModule } from '../config/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BookRequestsController],
  providers: [BookRequestsService],
})
export class BookRequestsModule {}
