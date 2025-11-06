import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book, BookStatus } from './book.interface';

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

    const sqliteBook = this.sqliteService.createBook({
      title: createBookDto.title,
      author: createBookDto.author,
      isbn: createBookDto.isbn || '',
      owner_id: ownerId,
    });
    
    // Convert SQLite Book to Book interface (add missing fields)
    return {
      id: sqliteBook.id,
      title: sqliteBook.title,
      author: sqliteBook.author,
      isbn: sqliteBook.isbn,
      owner_id: sqliteBook.owner_id,
      status: (sqliteBook.status as any) || BookStatus.AVAILABLE,
      count: 1,
      forSale: false,
      createdAt: sqliteBook.createdAt,
      updatedAt: sqliteBook.updatedAt,
    };
  }

  async findAll(query?: string, forSale?: boolean): Promise<Book[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        console.log(`📚 [BooksService] findAll: Querying books${query ? ` with filter: ${query}` : ''}`);
        let queryBuilder = this.supabaseService.getClient().from('books').select('*');

        if (query) {
          queryBuilder = queryBuilder.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
        }

        if (forSale) {
          queryBuilder = queryBuilder.eq('forSale', true);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.error(`❌ [BooksService] findAll error:`, error.message, error.code);
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.sqliteFindAll(query);
        }

        console.log(`✅ [BooksService] findAll: Found ${data?.length || 0} books`);
        
        // Check availability based on active transactions
        const booksWithAvailability = await Promise.all((data || []).map(async (book) => {
          const isAvailable = await this.checkBookAvailability(book.id, 'supabase');
          return {
            ...book,
            status: isAvailable ? BookStatus.AVAILABLE : BookStatus.BORROWED,
            isAvailable,
          };
        }));
        
        return booksWithAvailability;
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
    const sqliteBooks = this.sqliteService.findAllBooks(query);
    // Convert SQLite Book[] to Book[] interface (add missing fields) and check availability
    const db = this.sqliteService.getDatabase();
    const booksWithAvailability = sqliteBooks.map(book => {
      const isAvailable = this.checkBookAvailabilitySync(book.id);
      
      // Get count from database if available
      let bookCount = 1;
      try {
        const countResult = db.prepare('SELECT count FROM books WHERE id = ?').get(book.id) as any;
        bookCount = countResult?.count ?? 1;
      } catch (e) {
        // Count column might not exist
        bookCount = 1;
      }
      
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        owner_id: book.owner_id,
        status: isAvailable ? BookStatus.AVAILABLE : BookStatus.BORROWED,
        count: bookCount,
        forSale: false,
        isAvailable,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      };
    });
    return booksWithAvailability;
  }

  async findOne(id: string): Promise<Book> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('books')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.sqliteFindOne(id);
        }

        // Check availability and set isAvailable property
        const isAvailable = await this.checkBookAvailability(data.id, 'supabase');
        return {
          ...data,
          status: isAvailable ? BookStatus.AVAILABLE : BookStatus.BORROWED,
          isAvailable,
        };
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

    const sqliteBook = this.sqliteService.findBookById(id);
    if (!sqliteBook) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    // Check availability
    const isAvailable = this.checkBookAvailabilitySync(id);
    
    // Get count from database if available
    let bookCount = 1;
    try {
      const db = this.sqliteService.getDatabase();
      const countResult = db.prepare('SELECT count FROM books WHERE id = ?').get(id) as any;
      bookCount = countResult?.count ?? 1;
    } catch (e) {
      // Count column might not exist
      bookCount = 1;
    }

    // Convert SQLite Book to Book interface (add missing fields)
    return {
      id: sqliteBook.id,
      title: sqliteBook.title,
      author: sqliteBook.author,
      isbn: sqliteBook.isbn,
      owner_id: sqliteBook.owner_id,
      status: isAvailable ? BookStatus.AVAILABLE : BookStatus.BORROWED,
      count: bookCount,
      forSale: false,
      createdAt: sqliteBook.createdAt,
      updatedAt: sqliteBook.updatedAt,
    };
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
      const sqliteBook = this.sqliteService.updateBook(id, {
        title: updateBookDto.title,
        author: updateBookDto.author,
        isbn: updateBookDto.isbn,
      });
      
      // Convert SQLite Book to Book interface (add missing fields)
      return {
        id: sqliteBook.id,
        title: sqliteBook.title,
        author: sqliteBook.author,
        isbn: sqliteBook.isbn,
        owner_id: sqliteBook.owner_id,
        status: (sqliteBook.status ? (sqliteBook.status as BookStatus) : BookStatus.AVAILABLE),
        count: 1,
        forSale: false,
        createdAt: sqliteBook.createdAt,
        updatedAt: sqliteBook.updatedAt,
      };
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

  private async checkBookAvailability(bookId: string, storage: 'supabase' | 'sqlite'): Promise<boolean> {
    if (storage === 'supabase') {
      try {
        // Get book with count (default to 1 if count column doesn't exist)
        const { data: book } = await this.supabaseService.getClient()
          .from('books')
          .select('id, count')
          .eq('id', bookId)
          .single();
        
        if (!book) {
          return false; // Book doesn't exist
        }
        
        const bookCount = book.count ?? 1;
        
        // Count active transactions for this book
        const { count: activeBorrows } = await this.supabaseService.getClient()
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('bookId', bookId)
          .eq('type', 'borrow')
          .in('status', ['active', 'pending_return_approval']);
        
        // Book is available if: bookCount - activeBorrows > 0
        return (bookCount - (activeBorrows || 0)) > 0;
      } catch (error) {
        return true; // Default to available if check fails
      }
    } else {
      return this.checkBookAvailabilitySync(bookId);
    }
  }

  private checkBookAvailabilitySync(bookId: string): boolean {
    if (!this.sqliteService.isReady()) {
      return true; // Default to available if SQLite not ready
    }
    
    try {
      const db = this.sqliteService.getDatabase();
      
      // Get book count (default to 1 if count column doesn't exist)
      let bookCount = 1;
      try {
        const book = db.prepare('SELECT count FROM books WHERE id = ?').get(bookId) as any;
        bookCount = book?.count ?? 1;
      } catch (e) {
        // Count column might not exist, default to 1
        bookCount = 1;
      }
      
      // Count active transactions for this book (only valid books)
      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions t
        INNER JOIN books b ON t.bookId = b.id
        WHERE t.bookId = ? 
          AND t.type = 'borrow' 
          AND t.status IN ('active', 'pending_return_approval')
      `).get(bookId) as any;
      
      const activeBorrows = result?.count || 0;
      
      // Book is available if: bookCount - activeBorrows > 0
      return (bookCount - activeBorrows) > 0;
    } catch (error) {
      return true; // Default to available if check fails
    }
  }
}

