import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating, RatingStatus } from './rating.interface';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class RatingsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly membersService: MembersService,
    private readonly booksService: BooksService,
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

  /**
   * Find a completed transaction ID for the book and member
   */
  private async findCompletedTransactionId(memberId: string, bookId: string): Promise<string | null> {
    const storage = this.getPreferredStorage();
    
    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select('id')
          .eq('memberId', memberId)
          .eq('bookId', bookId)
          .eq('status', 'completed')
          .eq('type', 'borrow')
          .order('returnDate', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return !error && data ? data.id : null;
      } catch {
        return null;
      }
    } else {
      const db = this.sqliteService.getDatabase();
      const transaction = db.prepare(`
        SELECT id FROM transactions 
        WHERE memberId = ? AND bookId = ? 
        AND status = 'completed' AND type = 'borrow'
        ORDER BY returnDate DESC
        LIMIT 1
      `).get(memberId, bookId) as any;
      return transaction ? transaction.id : null;
    }
  }

  /**
   * Check if user has completed a return transaction for the book
   */
  private async hasCompletedReturn(memberId: string, bookId: string, transactionId?: string): Promise<boolean> {
    const storage = this.getPreferredStorage();
    
    if (transactionId) {
      // If transactionId is provided, verify it's a completed return transaction
      if (storage === 'supabase') {
        try {
          const { data, error } = await this.supabaseService
            .getClient()
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('memberId', memberId)
            .eq('bookId', bookId)
            .eq('status', 'completed')
            .eq('type', 'borrow')
            .single();
          
          return !error && !!data;
        } catch {
          return false;
        }
      } else {
        const db = this.sqliteService.getDatabase();
        const transaction = db.prepare(`
          SELECT * FROM transactions 
          WHERE id = ? AND memberId = ? AND bookId = ? 
          AND status = 'completed' AND type = 'borrow'
        `).get(transactionId, memberId, bookId) as any;
        return !!transaction;
      }
    }
    
    // If no transactionId, check if user has any completed return transaction for this book
    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select('*')
          .eq('memberId', memberId)
          .eq('bookId', bookId)
          .eq('status', 'completed')
          .eq('type', 'borrow')
          .limit(1);
        
        return !error && data && data.length > 0;
      } catch {
        return false;
      }
    } else {
      const db = this.sqliteService.getDatabase();
      const transaction = db.prepare(`
        SELECT * FROM transactions 
        WHERE memberId = ? AND bookId = ? 
        AND status = 'completed' AND type = 'borrow'
        LIMIT 1
      `).get(memberId, bookId) as any;
      return !!transaction;
    }
  }

  async create(createRatingDto: CreateRatingDto, memberId: string): Promise<Rating> {
    const { bookId, rating, transactionId } = createRatingDto;
    
    // Check if rating already exists - if so, allow update without strict validation
    const storage = this.getPreferredStorage();
    let existingRating: any = null;
    
    if (storage === 'supabase') {
      try {
        const { data } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('*')
          .eq('bookId', bookId)
          .eq('memberId', memberId)
          .maybeSingle();
        existingRating = data;
      } catch {
        // Fall through to SQLite check
      }
    } else {
      const db = this.sqliteService.getDatabase();
      existingRating = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    }
    
    // If rating exists, allow update (user has already rated before, so they've returned the book)
    if (!existingRating) {
      // For new ratings, check if user has completed a return transaction for this book
      let validTransactionId: string | undefined = transactionId;
      const hasCompleted = await this.hasCompletedReturn(memberId, bookId, transactionId);
      
      // If no transactionId provided or validation failed, try to find a completed transaction
      if (!hasCompleted && !transactionId) {
        const foundTransactionId = await this.findCompletedTransactionId(memberId, bookId);
        if (foundTransactionId) {
          const recheck = await this.hasCompletedReturn(memberId, bookId, foundTransactionId);
          if (recheck) {
            // Use the found transactionId
            validTransactionId = foundTransactionId;
            createRatingDto.transactionId = foundTransactionId;
          } else {
            throw new BadRequestException('You can only rate books that you have borrowed and returned.');
          }
        } else {
          throw new BadRequestException('You can only rate books that you have borrowed and returned.');
        }
      } else if (!hasCompleted) {
        throw new BadRequestException('You can only rate books that you have borrowed and returned.');
      }
    }

    if (storage === 'supabase') {
      try {
        // Check if rating already exists (prevent duplicates)
        const { data: existing } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('*')
          .eq('bookId', bookId)
          .eq('memberId', memberId)
          .maybeSingle();

        if (existing) {
          // Update existing rating (ratings are immediate, no approval needed)
          // Only update transactionId if provided and valid, otherwise keep existing
          const updateData: any = {
            rating,
            status: 'approved', // Ratings are immediate, no approval needed
            updatedAt: new Date().toISOString(),
          };
          
          // Only set transactionId if provided and valid
          // If transactionId is provided, validate it exists (for foreign key constraint)
          if (transactionId) {
            // Validate transaction exists before setting it
            const { data: txCheck } = await this.supabaseService
              .getClient()
              .from('transactions')
              .select('id')
              .eq('id', transactionId)
              .maybeSingle();
            
            if (txCheck) {
              updateData.transactionId = transactionId;
            } else if (existing.transactionId) {
              // Keep existing transactionId if new one is invalid
              updateData.transactionId = existing.transactionId;
            }
            // If neither is valid, don't set transactionId (will remain null)
          } else if (existing.transactionId) {
            updateData.transactionId = existing.transactionId;
          }
          
          const { data, error } = await this.supabaseService
            .getClient()
            .from('ratings')
            .update(updateData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) {
            throw new Error(error.message);
          }

          return {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
          };
        }

        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .insert([{
            bookId,
            memberId,
            rating,
            transactionId,
            status: 'approved', // Ratings are immediate, no approval needed
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase rating creation error, falling back to SQLite:', error.message);
          return this.createInSqlite(createRatingDto, memberId);
        }

        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        };
      } catch (error: any) {
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          throw error;
        }
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

    const { bookId, rating, transactionId } = createRatingDto;
    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    // Check if rating already exists (we already checked above, but check again for SQLite path)
    const existing = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    if (existing) {
      // Update existing rating (ratings are immediate, no approval needed)
      // Only update transactionId if provided and valid, otherwise keep existing
      let finalTransactionId = existing.transactionId || null;
      if (transactionId) {
        // Validate transactionId exists before using it
        const txExists = db.prepare('SELECT id FROM transactions WHERE id = ?').get(transactionId);
        if (txExists) {
          finalTransactionId = transactionId;
        }
      }
      
      db.prepare(`
        UPDATE ratings 
        SET rating = ?, transactionId = ?, status = 'approved', updatedAt = ?
        WHERE bookId = ? AND memberId = ?
      `).run(rating, finalTransactionId, now, bookId, memberId);
      
      const updated = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
      return {
        id: updated.id,
        bookId,
        memberId,
        transactionId: updated.transactionId || undefined,
        rating,
        status: updated.status || 'pending',
        rejectionReason: updated.rejectionReason || undefined,
        approvedBy: updated.approvedBy || undefined,
        approvedAt: updated.approvedAt ? new Date(updated.approvedAt) : undefined,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      };
    }

    // Insert new rating
    // Validate transactionId exists before using it (for foreign key constraint)
    let finalTransactionId: string | null = null;
    if (transactionId) {
      const txExists = db.prepare('SELECT id FROM transactions WHERE id = ?').get(transactionId);
      if (txExists) {
        finalTransactionId = transactionId;
      }
      // If transactionId doesn't exist, set to null (don't fail)
    }
    
    const id = `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO ratings (id, bookId, memberId, transactionId, rating, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
    `).run(id, bookId, memberId, finalTransactionId, rating, now, now);

    const inserted = db.prepare('SELECT * FROM ratings WHERE id = ?').get(id) as any;
    return {
      id: inserted.id,
      bookId,
      memberId,
      transactionId: inserted.transactionId || undefined,
      rating,
      status: 'pending',
      createdAt: new Date(inserted.createdAt),
      updatedAt: new Date(inserted.updatedAt),
    };
  }

  async findAverageForBook(bookId: string): Promise<number> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        // Only count approved ratings
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('rating')
          .eq('bookId', bookId)
          .eq('status', 'approved');

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
      // Only count approved ratings
      const ratings = db.prepare(`
        SELECT rating FROM ratings 
        WHERE bookId = ? AND status = 'approved'
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

  /**
   * Get all pending ratings for admin approval
   */
  async findPending(): Promise<Rating[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('*')
          .eq('status', 'pending')
          .order('createdAt', { ascending: false });

        if (error) {
          console.warn('⚠️ Supabase pending ratings query error, falling back to SQLite:', error.message);
          return this.findPendingInSqlite();
        }

        return (data || []).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
        }));
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.findPendingInSqlite();
      }
    }

    return this.findPendingInSqlite();
  }

  private findPendingInSqlite(): Rating[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      const ratings = db.prepare(`
        SELECT * FROM ratings 
        WHERE status = 'pending'
        ORDER BY createdAt DESC
      `).all() as any[];

      return ratings.map((r: any) => ({
        id: r.id,
        bookId: r.bookId,
        memberId: r.memberId,
        transactionId: r.transactionId || undefined,
        rating: r.rating,
        status: r.status || 'pending',
        rejectionReason: r.rejectionReason || undefined,
        approvedBy: r.approvedBy || undefined,
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite pending ratings query error:', error.message);
      return [];
    }
  }

  /**
   * Approve a rating (Admin only)
   */
  async approve(ratingId: string, adminId: string): Promise<Rating> {
    const storage = this.getPreferredStorage();
    const now = new Date().toISOString();
    let rating: Rating;

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .update({
            status: 'approved',
            approvedBy: adminId,
            approvedAt: now,
            updatedAt: now,
          })
          .eq('id', ratingId)
          .eq('status', 'pending')
          .select()
          .single();

        if (error) {
          throw new NotFoundException('Rating not found or already processed');
        }

        rating = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          approvedAt: new Date(data.approvedAt),
        };
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase approval error, falling back to SQLite:', error.message);
        rating = this.approveInSqlite(ratingId, adminId);
      }
    } else {
      rating = this.approveInSqlite(ratingId, adminId);
    }

    // Send email notification
    try {
      const member = await this.membersService.findOne(rating.memberId);
      const book = await this.booksService.findOne(rating.bookId);
      await this.emailService.sendRatingApprovalEmail(member.email, member.name, book.title, true);
    } catch (error: any) {
      console.warn('⚠️ Failed to send approval email:', error.message);
    }

    return rating;
  }

  private approveInSqlite(ratingId: string, adminId: string): Rating {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    const rating = db.prepare('SELECT * FROM ratings WHERE id = ? AND status = ?').get(ratingId, 'pending') as any;
    if (!rating) {
      throw new NotFoundException('Rating not found or already processed');
    }

    db.prepare(`
      UPDATE ratings 
      SET status = 'approved', approvedBy = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(adminId, now, now, ratingId);

    const updated = db.prepare('SELECT * FROM ratings WHERE id = ?').get(ratingId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      transactionId: updated.transactionId || undefined,
      rating: updated.rating,
      status: 'approved',
      approvedBy: updated.approvedBy,
      approvedAt: new Date(updated.approvedAt),
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }

  /**
   * Reject a rating (Admin only)
   */
  async reject(ratingId: string, adminId: string, reason: string): Promise<Rating> {
    const storage = this.getPreferredStorage();
    const now = new Date().toISOString();
    let rating: Rating;

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .update({
            status: 'rejected',
            approvedBy: adminId,
            rejectionReason: reason,
            approvedAt: now,
            updatedAt: now,
          })
          .eq('id', ratingId)
          .eq('status', 'pending')
          .select()
          .single();

        if (error) {
          throw new NotFoundException('Rating not found or already processed');
        }

        rating = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          approvedAt: new Date(data.approvedAt),
        };
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase rejection error, falling back to SQLite:', error.message);
        rating = this.rejectInSqlite(ratingId, adminId, reason);
      }
    } else {
      rating = this.rejectInSqlite(ratingId, adminId, reason);
    }

    // Send email notification
    try {
      const member = await this.membersService.findOne(rating.memberId);
      const book = await this.booksService.findOne(rating.bookId);
      await this.emailService.sendRatingApprovalEmail(member.email, member.name, book.title, false, reason);
    } catch (error: any) {
      console.warn('⚠️ Failed to send rejection email:', error.message);
    }

    return rating;
  }

  private rejectInSqlite(ratingId: string, adminId: string, reason: string): Rating {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    const rating = db.prepare('SELECT * FROM ratings WHERE id = ? AND status = ?').get(ratingId, 'pending') as any;
    if (!rating) {
      throw new NotFoundException('Rating not found or already processed');
    }

    db.prepare(`
      UPDATE ratings 
      SET status = 'rejected', approvedBy = ?, rejectionReason = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(adminId, reason, now, now, ratingId);

    const updated = db.prepare('SELECT * FROM ratings WHERE id = ?').get(ratingId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      transactionId: updated.transactionId || undefined,
      rating: updated.rating,
      status: 'rejected',
      rejectionReason: updated.rejectionReason,
      approvedBy: updated.approvedBy,
      approvedAt: new Date(updated.approvedAt),
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }
}
