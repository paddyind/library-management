import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating } from './rating.interface';

@Injectable()
export class RatingsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storagePreference = this.configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();
    if (storagePreference === 'supabase' && this.supabaseService.isReady()) {
      return 'supabase';
    }
    if (storagePreference === 'sqlite' && this.sqliteService.isReady()) {
      return 'sqlite';
    }
    // Auto mode: prefer Supabase if available, else SQLite
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    return 'sqlite';
  }

  async create(createRatingDto: CreateRatingDto, memberId: string): Promise<Rating> {
    const storage = this.getPreferredStorage();
    const { bookId, rating } = createRatingDto;

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .insert([{ bookId, memberId, rating }])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase rating creation error, falling back to SQLite:', error.message);
          return this.createInSqlite(createRatingDto, memberId);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.createInSqlite(createRatingDto, memberId);
      }
    }

    return this.createInSqlite(createRatingDto, memberId);
  }

  private createInSqlite(createRatingDto: CreateRatingDto, memberId: string): Rating {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const { bookId, rating } = createRatingDto;
    const db = this.sqliteService.getDatabase();
    const id = `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Check if rating already exists
    const existing = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    if (existing) {
      // Update existing rating
      db.prepare(`
        UPDATE ratings 
        SET rating = ?, updatedAt = ?
        WHERE bookId = ? AND memberId = ?
      `).run(rating, now, bookId, memberId);
      return {
        id: existing.id,
        bookId,
        memberId,
        rating,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(now),
      };
    }

    // Insert new rating
    db.prepare(`
      INSERT INTO ratings (id, bookId, memberId, rating, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, bookId, memberId, rating, now, now);

    return {
      id,
      bookId,
      memberId,
      rating,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async findAverageForBook(bookId: string): Promise<number> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('rating')
          .eq('bookId', bookId);

        if (error) {
          console.warn('⚠️ Supabase ratings query error, falling back to SQLite:', error.message);
          return this.findAverageForBookInSqlite(bookId);
        }

        if (!data || data.length === 0) {
          return 0;
        }

        const sum = data.reduce((acc: number, { rating }: any) => acc + rating, 0);
        return sum / data.length;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.findAverageForBookInSqlite(bookId);
      }
    }

    return this.findAverageForBookInSqlite(bookId);
  }

  private findAverageForBookInSqlite(bookId: string): number {
    if (!this.sqliteService.isReady()) {
      return 0;
    }

    try {
      const db = this.sqliteService.getDatabase();
      const ratings = db.prepare(`
        SELECT rating FROM ratings 
        WHERE bookId = ?
      `).all(bookId) as Array<{ rating: number }>;

      if (!ratings || ratings.length === 0) {
        return 0;
      }

      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      return sum / ratings.length;
    } catch (error: any) {
      console.warn('⚠️ SQLite ratings query error:', error.message);
      return 0;
    }
  }
}
