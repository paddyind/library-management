import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { BooksModule } from '../books/books.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [BooksModule, UsersModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
