import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateReviewDto } from '../dto/review.dto';
import { Review } from './review.interface';

@Injectable()
export class ReviewsService {
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

  async create(createReviewDto: CreateReviewDto, memberId: string): Promise<Review> {
    const storage = this.getPreferredStorage();
    const { bookId, review } = createReviewDto;

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('reviews')
          .insert([{ bookId, memberId, review }])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase review creation error, falling back to SQLite:', error.message);
          return this.createInSqlite(createReviewDto, memberId);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.createInSqlite(createReviewDto, memberId);
      }
    }

    return this.createInSqlite(createReviewDto, memberId);
  }

  private createInSqlite(createReviewDto: CreateReviewDto, memberId: string): Review {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const { bookId, review } = createReviewDto;
    const db = this.sqliteService.getDatabase();
    const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Check if review already exists
    const existing = db.prepare('SELECT * FROM reviews WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    if (existing) {
      // Update existing review
      db.prepare(`
        UPDATE reviews 
        SET review = ?, updatedAt = ?
        WHERE bookId = ? AND memberId = ?
      `).run(review, now, bookId, memberId);
      return {
        id: existing.id,
        bookId,
        memberId,
        review,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(now),
      };
    }

    // Insert new review
    db.prepare(`
      INSERT INTO reviews (id, bookId, memberId, review, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, bookId, memberId, review, now, now);

    return {
      id,
      bookId,
      memberId,
      review,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async findAllForBook(bookId: string): Promise<Review[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('reviews')
          .select('*')
          .eq('bookId', bookId)
          .order('createdAt', { ascending: false });

        if (error) {
          console.warn('⚠️ Supabase reviews query error, falling back to SQLite:', error.message);
          return this.findAllForBookInSqlite(bookId);
        }

        return (data || []).map((r: any) => ({
          id: r.id,
          bookId: r.bookId,
          memberId: r.memberId,
          review: r.review,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        }));
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.findAllForBookInSqlite(bookId);
      }
    }

    return this.findAllForBookInSqlite(bookId);
  }

  private findAllForBookInSqlite(bookId: string): Review[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      const reviews = db.prepare(`
        SELECT * FROM reviews 
        WHERE bookId = ?
        ORDER BY createdAt DESC
      `).all(bookId) as any[];

      return reviews.map((r: any) => ({
        id: r.id,
        bookId: r.bookId,
        memberId: r.memberId,
        review: r.review,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite reviews query error:', error.message);
      return [];
    }
  }
}
