import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book } from './book.interface';

@Injectable()
export class BooksService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storagePreference = this.configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();
    
    // Force SQLite if explicitly configured
    if (storagePreference === 'sqlite') {
      return 'sqlite';
    }
    
    // Force Supabase if explicitly configured (even if health check failed)
    if (storagePreference === 'supabase') {
      return 'supabase';
    }
    
    // Auto mode (default): Use Supabase ONLY if health check passed at startup
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    
    // Default to SQLite if Supabase health check failed or not configured
    return 'sqlite';
  }

  async create(createBookDto: CreateBookDto, ownerId: string): Promise<Book> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        console.log('📚 Attempting to create book in Supabase...');
        const supabase = this.supabaseService.getClient();
        const { data, error } = await supabase
          .from('books')
          .insert([{ ...createBookDto, owner_id: ownerId }])
          .select()
          .single();

        if (error) {
          console.error('❌ Supabase insert error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          console.warn('⚠️ Falling back to SQLite for book creation');
          return this.sqliteCreate(createBookDto, ownerId);
        }

        console.log('✅ Book created successfully in Supabase:', data.id);
        return data;
      } catch (error: any) {
        console.error('❌ Supabase connection exception:', {
          message: error.message,
          stack: error.stack,
        });
        console.warn('⚠️ Falling back to SQLite for book creation');
        return this.sqliteCreate(createBookDto, ownerId);
      }
    }

    return this.sqliteCreate(createBookDto, ownerId);
  }

  private sqliteCreate(createBookDto: CreateBookDto, ownerId: string): Book {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    return this.sqliteService.createBook({
      title: createBookDto.title,
      author: createBookDto.author,
      isbn: createBookDto.isbn || '',
      owner_id: ownerId,
    });
  }

  async findAll(query?: string): Promise<Book[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        console.log(`📚 [BooksService] findAll: Querying books${query ? ` with filter: ${query}` : ''}`);
        let queryBuilder = this.supabaseService.getClient().from('books').select('*');

        if (query) {
          queryBuilder = queryBuilder.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.error(`❌ [BooksService] findAll error:`, error.message, error.code);
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.sqliteFindAll(query);
        }

        console.log(`✅ [BooksService] findAll: Found ${data?.length || 0} books`);
        return data || [];
      } catch (error: any) {
        console.error(`❌ [BooksService] findAll exception:`, error.message);
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteFindAll(query);
      }
    }

    console.log(`📚 [BooksService] findAll: Using SQLite${query ? ` with filter: ${query}` : ''}`);
    return this.sqliteFindAll(query);
  }

  private sqliteFindAll(query?: string): Book[] {
    if (!this.sqliteService.isReady()) {
      console.log('📚 SQLite not available - returning empty array');
      return [];
    }

    // Removed log to reduce noise - books are fetched on demand
    return this.sqliteService.findAllBooks(query);
  }

  async findOne(id: string): Promise<Book> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('books')
          .select('*, owner:members(*), loans:loans(*)')
          .eq('id', id)
          .single();

        if (error) {
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.sqliteFindOne(id);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteFindOne(id);
      }
    }

    return this.sqliteFindOne(id);
  }

  private sqliteFindOne(id: string): Book {
    if (!this.sqliteService.isReady()) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    const book = this.sqliteService.findBookById(id);
    if (!book) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('books')
          .update(updateBookDto)
          .eq('id', id)
          .single();

        if (error) {
          console.warn('⚠️ Supabase update error, falling back to SQLite:', error.message);
          return this.sqliteUpdate(id, updateBookDto);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteUpdate(id, updateBookDto);
      }
    }

    return this.sqliteUpdate(id, updateBookDto);
  }

  private sqliteUpdate(id: string, updateBookDto: UpdateBookDto): Book {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    try {
      return this.sqliteService.updateBook(id, {
        title: updateBookDto.title,
        author: updateBookDto.author,
        isbn: updateBookDto.isbn,
      });
    } catch (error: any) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }

  async remove(id: string): Promise<void> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { error } = await this.supabaseService.getClient().from('books').delete().eq('id', id);

        if (error) {
          console.warn('⚠️ Supabase delete error, falling back to SQLite:', error.message);
          this.sqliteRemove(id);
          return;
        }

        return;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        this.sqliteRemove(id);
        return;
      }
    }

    this.sqliteRemove(id);
  }

  private sqliteRemove(id: string): void {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    try {
      this.sqliteService.deleteBook(id);
    } catch (error: any) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }
}

