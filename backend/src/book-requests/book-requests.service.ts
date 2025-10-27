import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookRequest } from '../models/book-request.entity';
import { CreateBookRequestDto } from '../dto/book-request.dto';
import { Member } from '../models/member.entity';

@Injectable()
export class BookRequestsService {
  constructor(
    @InjectRepository(BookRequest)
    private readonly bookRequestsRepository: Repository<BookRequest>,
  ) {}

  async create(createBookRequestDto: CreateBookRequestDto, member: Member): Promise<BookRequest> {
    const bookRequest = this.bookRequestsRepository.create({
      ...createBookRequestDto,
      member,
    });
    return this.bookRequestsRepository.save(bookRequest);
  }

  async findAll(): Promise<BookRequest[]> {
    return this.bookRequestsRepository.find({ relations: ['member'] });
  }

  async findOne(id: string): Promise<BookRequest> {
    const bookRequest = await this.bookRequestsRepository.findOne({ where: { id }, relations: ['member'] });
    if (!bookRequest) {
      throw new NotFoundException(`Book request with ID "${id}" not found`);
    }
    return bookRequest;
  }

  async findByMember(memberId: string): Promise<BookRequest[]> {
    return this.bookRequestsRepository.find({ where: { member: { id: memberId } } });
  }

  async remove(id: string): Promise<void> {
    const bookRequest = await this.findOne(id);
    await this.bookRequestsRepository.remove(bookRequest);
  }
}
