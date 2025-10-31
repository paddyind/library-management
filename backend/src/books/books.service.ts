import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book } from './book.interface';

// Mock data for when Supabase is not configured
const MOCK_BOOKS: Book[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    owner_id: 'mock-owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0061120084',
    owner_id: 'mock-owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    title: '1984',
    author: 'George Orwell',
    isbn: '978-0451524935',
    owner_id: 'mock-owner-2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

@Injectable()
export class BooksService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createBookDto: CreateBookDto, ownerId: string): Promise<Book> {
    if (!this.supabaseService.isReady()) {
      throw new Error('Database not configured. Please configure Supabase credentials.');
    }

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
    // Return mock data if Supabase is not configured
    if (!this.supabaseService.isReady()) {
      console.log('📚 Returning mock books data - Supabase not configured');
      if (query) {
        const lowerQuery = query.toLowerCase();
        return MOCK_BOOKS.filter(
          (book) =>
            book.title.toLowerCase().includes(lowerQuery) ||
            book.author.toLowerCase().includes(lowerQuery) ||
            book.isbn.includes(query)
        );
      }
      return MOCK_BOOKS;
    }

    try {
      let queryBuilder = this.supabaseService.getClient().from('books').select('*');

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.warn('⚠️ Supabase query error, falling back to mock data:', error.message);
        return this.getMockBooks(query);
      }

      return data || [];
    } catch (error) {
      console.warn('⚠️ Supabase connection failed, falling back to mock data:', error.message);
      return this.getMockBooks(query);
    }
  }

  private getMockBooks(query?: string): Book[] {
    if (query) {
      const lowerQuery = query.toLowerCase();
      return MOCK_BOOKS.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerQuery) ||
          book.author.toLowerCase().includes(lowerQuery) ||
          book.isbn.includes(query)
      );
    }
    return MOCK_BOOKS;
  }

  async findOne(id: string): Promise<Book> {
    // Return mock data if Supabase is not configured
    if (!this.supabaseService.isReady()) {
      const book = MOCK_BOOKS.find((b) => b.id === id);
      if (!book) {
        throw new NotFoundException(`Book with ID "${id}" not found`);
      }
      return book;
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('books')
        .select('*, owner:members(*), loans:loans(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('⚠️ Supabase query error, falling back to mock data:', error.message);
        const book = MOCK_BOOKS.find((b) => b.id === id);
        if (!book) {
          throw new NotFoundException(`Book with ID "${id}" not found`);
        }
        return book;
      }

      return data;
    } catch (error) {
      console.warn('⚠️ Supabase connection failed, falling back to mock data');
      const book = MOCK_BOOKS.find((b) => b.id === id);
      if (!book) {
        throw new NotFoundException(`Book with ID "${id}" not found`);
      }
      return book;
    }
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    if (!this.supabaseService.isReady()) {
      throw new Error('Database not configured. Please configure Supabase credentials.');
    }

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
    if (!this.supabaseService.isReady()) {
      throw new Error('Database not configured. Please configure Supabase credentials.');
    }

    const { error } = await this.supabaseService.getClient().from('books').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }
}

