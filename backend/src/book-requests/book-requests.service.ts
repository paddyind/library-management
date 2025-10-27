import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookRequest, BookRequestStatus } from '../models/book-request.entity';
import { CreateBookRequestDto } from '../dto/create-book-request.dto';
import { Member } from '../models/member.entity';

@Injectable()
export class BookRequestsService {
  constructor(
    @InjectRepository(BookRequest)
    private readonly bookRequestRepository: Repository<BookRequest>,
  ) {}

  async create(createBookRequestDto: CreateBookRequestDto, member: Member): Promise<BookRequest> {
    const bookRequest = this.bookRequestRepository.create({
      ...createBookRequestDto,
      requestedBy: member,
    });
    return this.bookRequestRepository.save(bookRequest);
  }

  async findAll(): Promise<BookRequest[]> {
    return this.bookRequestRepository.find({ relations: ['requestedBy'] });
  }

  async findByMemberId(memberId: string): Promise<BookRequest[]> {
    return this.bookRequestRepository.find({
      where: { requestedBy: { id: memberId } },
      relations: ['requestedBy'],
    });
  }

  async update(id: string, status: BookRequestStatus): Promise<BookRequest> {
    const bookRequest = await this.bookRequestRepository.findOne({ where: { id } });
    bookRequest.status = status;
    return this.bookRequestRepository.save(bookRequest);
  }
}
