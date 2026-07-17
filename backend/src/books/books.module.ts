import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SqliteModule, AuthModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
