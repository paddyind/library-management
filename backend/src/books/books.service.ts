import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../models/book.entity';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly booksRepository: Repository<Book>,
  ) {}

  async create(createBookDto: CreateBookDto, ownerId: string): Promise<Book> {
    const book = this.booksRepository.create({
      ...createBookDto,
      owner: { id: ownerId } as any,
    });
    return this.booksRepository.save(book);
  }

  async findAll(): Promise<Book[]> {
    return this.booksRepository.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.booksRepository.findOne({
      where: { id },
      relations: ['owner', 'loans'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);
    const updated = Object.assign(book, updateBookDto);
    return this.booksRepository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findOne(id);
    await this.booksRepository.remove(book);
  }

  async search(query: string): Promise<Book[]> {
    return this.booksRepository
      .createQueryBuilder('book')
      .where('book.title LIKE :query', { query: `%${query}%` })
      .orWhere('book.author LIKE :query', { query: `%${query}%` })
      .orWhere('book.isbn LIKE :query', { query: `%${query}%` })
      .getMany();
  }
}
