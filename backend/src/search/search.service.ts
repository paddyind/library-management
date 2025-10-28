import { Injectable } from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { MembersService } from '../members/members.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly booksService: BooksService,
    private readonly membersService: MembersService,
  ) {}

  async search(query: string, type: string) {
    if (type === 'members') {
      return this.membersService.findAll(query);
    }
    return this.booksService.findAll(query);
  }
}
