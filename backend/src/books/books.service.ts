import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book } from './book.interface';

@Injectable()
export class BooksService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createBookDto: CreateBookDto, ownerId: string): Promise<Book> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('books')
      .insert([{ ...createBookDto, owner_id: ownerId }])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(query?: string): Promise<Book[]> {
    let queryBuilder = this.supabaseService.getClient().from('books').select('*');

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findOne(id: string): Promise<Book> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('books')
      .select('*, owner:members(*), loans:loans(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    return data;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('books')
      .update(updateBookDto)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('books').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }
}
