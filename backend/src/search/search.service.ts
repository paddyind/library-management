import { Injectable } from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly booksService: BooksService,
    private readonly usersService: UsersService,
  ) {}

  async search(query: string, type: string) {
    if (type === 'members') {
      return this.usersService.findAll(query);
    }
    return this.booksService.findAll(query);
  }
}
