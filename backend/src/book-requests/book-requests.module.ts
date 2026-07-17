import { Module } from '@nestjs/common';
import { BookRequestsController } from './book-requests.controller';
import { BookRequestsService } from './book-requests.service';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { SqliteModule } from '../config/sqlite.module';

@Module({
  imports: [SqliteModule, AuthModule, MembersModule],
  controllers: [BookRequestsController],
  providers: [BookRequestsService],
})
export class BookRequestsModule {}
