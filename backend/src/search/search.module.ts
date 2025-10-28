import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { BooksModule } from '../books/books.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [BooksModule, MembersModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
