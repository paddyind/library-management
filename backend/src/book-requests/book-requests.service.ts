import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateBookRequestDto } from '../dto/book-request.dto';
import { BookRequest } from './book-request.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class BookRequestsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createBookRequestDto: CreateBookRequestDto, member: Member): Promise<BookRequest> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('book_requests')
      .insert([
        {
          ...createBookRequestDto,
          member_id: member.id,
        },
      ])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(): Promise<BookRequest[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('book_requests')
      .select('*, member:members(*)');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findOne(id: string): Promise<BookRequest> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('book_requests')
      .select('*, member:members(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Book request with ID "${id}" not found`);
    }

    return data;
  }

  async findByMember(memberId: string): Promise<BookRequest[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('book_requests')
      .select('*')
      .eq('member_id', memberId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('book_requests').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Book request with ID "${id}" not found`);
    }
  }
}
