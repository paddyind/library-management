import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateReviewDto } from '../dto/review.dto';
import { Review, ReviewStatus } from './review.interface';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';
import { RatingsService } from '../ratings/ratings.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly membersService: MembersService,
    private readonly booksService: BooksService,
    private readonly ratingsService: RatingsService,
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

  async create(createReviewDto: CreateReviewDto, memberId: string): Promise<Review> {
    const { bookId, review, transactionId } = createReviewDto;
    
    // Check if review already exists - if so, allow update without strict validation
    const storage = this.getPreferredStorage();
    let existingReview: any = null;
    
    if (storage === 'supabase') {
      try {
        const { data } = await this.supabaseService
          .getClient()
          .from('reviews')
          .select('*')
          .eq('bookId', bookId)
          .eq('memberId', memberId)
          .maybeSingle();
        existingReview = data;
      } catch {
        // Fall through to SQLite check
      }
    } else {
      const db = this.sqliteService.getDatabase();
      existingReview = db.prepare('SELECT * FROM reviews WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    }
    
    // If review exists, allow update (user has already reviewed before, so they've returned the book)
    if (!existingReview) {
      // For new reviews, check if user has completed a return transaction for this book
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
            createReviewDto.transactionId = foundTransactionId;
          } else {
            throw new BadRequestException('You can only review books that you have borrowed and returned.');
          }
        } else {
          throw new BadRequestException('You can only review books that you have borrowed and returned.');
        }
      } else if (!hasCompleted) {
        throw new BadRequestException('You can only review books that you have borrowed and returned.');
      }
    }

    if (storage === 'supabase') {
      try {
        // Check if review already exists (prevent duplicates)
        const { data: existing } = await this.supabaseService
          .getClient()
          .from('reviews')
          .select('*')
          .eq('bookId', bookId)
          .eq('memberId', memberId)
          .maybeSingle();

        if (existing) {
          // Update existing review with new status pending
          // Only update transactionId if provided and valid, otherwise keep existing
          const updateData: any = {
            review,
            status: 'pending',
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
            .from('reviews')
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
          .from('reviews')
          .insert([{
            bookId,
            memberId,
            review,
            transactionId,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase review creation error, falling back to SQLite:', error.message);
          return this.createInSqlite(createReviewDto, memberId);
        }

        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
        };
      } catch (error: any) {
        if (error instanceof BadRequestException) {
          throw error;
        }
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

    const { bookId, review, transactionId } = createReviewDto;
    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    // Check if review already exists (we already checked above, but check again for SQLite path)
    const existing = db.prepare('SELECT * FROM reviews WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
    if (existing) {
      // Update existing review with new status pending
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
        UPDATE reviews 
        SET review = ?, transactionId = ?, status = 'pending', updatedAt = ?
        WHERE bookId = ? AND memberId = ?
      `).run(review, finalTransactionId, now, bookId, memberId);
      
      const updated = db.prepare('SELECT * FROM reviews WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
      return {
        id: updated.id,
        bookId,
        memberId,
        transactionId: updated.transactionId || undefined,
        review,
        status: updated.status || 'pending',
        rejectionReason: updated.rejectionReason || undefined,
        approvedBy: updated.approvedBy || undefined,
        approvedAt: updated.approvedAt ? new Date(updated.approvedAt) : undefined,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      };
    }

    // Insert new review
    // Validate transactionId exists before using it (for foreign key constraint)
    let finalTransactionId: string | null = null;
    if (transactionId) {
      const txExists = db.prepare('SELECT id FROM transactions WHERE id = ?').get(transactionId);
      if (txExists) {
        finalTransactionId = transactionId;
      }
      // If transactionId doesn't exist, set to null (don't fail)
    }
    
    const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO reviews (id, bookId, memberId, transactionId, review, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, bookId, memberId, finalTransactionId, review, now, now);

    const inserted = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as any;
    return {
      id: inserted.id,
      bookId,
      memberId,
      transactionId: inserted.transactionId || undefined,
      review,
      status: 'pending',
      createdAt: new Date(inserted.createdAt),
      updatedAt: new Date(inserted.updatedAt),
    };
  }

  async findAllForBook(bookId: string): Promise<Review[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        // Only show approved reviews
        const { data, error } = await this.supabaseService
          .getClient()
          .from('reviews')
          .select('*')
          .eq('bookId', bookId)
          .eq('status', 'approved')
          .order('createdAt', { ascending: false });

        if (error) {
          console.warn('⚠️ Supabase reviews query error, falling back to SQLite:', error.message);
          return this.findAllForBookInSqlite(bookId);
        }

        return (data || []).map((r: any) => ({
          id: r.id,
          bookId: r.bookId,
          memberId: r.memberId,
          transactionId: r.transactionId || undefined,
          review: r.review,
          status: r.status || 'approved',
          rejectionReason: r.rejectionReason || undefined,
          approvedBy: r.approvedBy || undefined,
          approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
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
      // Only show approved reviews
      const reviews = db.prepare(`
        SELECT * FROM reviews 
        WHERE bookId = ? AND status = 'approved'
        ORDER BY createdAt DESC
      `).all(bookId) as any[];

      return reviews.map((r: any) => ({
        id: r.id,
        bookId: r.bookId,
        memberId: r.memberId,
        transactionId: r.transactionId || undefined,
        review: r.review,
        status: r.status || 'approved',
        rejectionReason: r.rejectionReason || undefined,
        approvedBy: r.approvedBy || undefined,
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite reviews query error:', error.message);
      return [];
    }
  }

  /**
   * Get all pending reviews for admin approval with enriched data (book name, member name, rating)
   */
  async findPending(): Promise<any[]> {
    const storage = this.getPreferredStorage();
    let reviews: Review[] = [];

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('reviews')
          .select('*')
          .eq('status', 'pending')
          .order('createdAt', { ascending: false });

        if (error) {
          console.warn('⚠️ Supabase pending reviews query error, falling back to SQLite:', error.message);
          reviews = this.findPendingInSqlite();
        } else {
          reviews = (data || []).map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
          }));
        }
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        reviews = this.findPendingInSqlite();
      }
    } else {
      reviews = this.findPendingInSqlite();
    }

    // Enrich reviews with book name, member name, and rating
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        try {
          const [book, member, rating] = await Promise.all([
            this.booksService.findOne(review.bookId).catch(() => null),
            this.membersService.findOne(review.memberId).catch(() => null),
            this.findRatingForReview(review.bookId, review.memberId).catch(() => null),
          ]);

          return {
            ...review,
            bookName: book?.title || 'Unknown Book',
            memberName: member?.name || 'Unknown User',
            rating: rating?.rating || null,
          };
        } catch (error) {
          console.warn(`⚠️ Error enriching review ${review.id}:`, error);
          return {
            ...review,
            bookName: 'Unknown Book',
            memberName: 'Unknown User',
            rating: null,
          };
        }
      })
    );

    return enrichedReviews;
  }

  /**
   * Find rating for a specific book and member
   */
  private async findRatingForReview(bookId: string, memberId: string): Promise<any> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('ratings')
          .select('*')
          .eq('bookId', bookId)
          .eq('memberId', memberId)
          .maybeSingle();

        if (error || !data) {
          return null;
        }

        return {
          id: data.id,
          rating: data.rating,
          status: data.status,
        };
      } catch {
        return null;
      }
    } else {
      try {
        const db = this.sqliteService.getDatabase();
        const rating = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(bookId, memberId) as any;
        if (!rating) {
          return null;
        }
        return {
          id: rating.id,
          rating: rating.rating,
          status: rating.status,
        };
      } catch {
        return null;
      }
    }
  }

  private findPendingInSqlite(): Review[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      const reviews = db.prepare(`
        SELECT * FROM reviews 
        WHERE status = 'pending'
        ORDER BY createdAt DESC
      `).all() as any[];

      return reviews.map((r: any) => ({
        id: r.id,
        bookId: r.bookId,
        memberId: r.memberId,
        transactionId: r.transactionId || undefined,
        review: r.review,
        status: r.status || 'pending',
        rejectionReason: r.rejectionReason || undefined,
        approvedBy: r.approvedBy || undefined,
        approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite pending reviews query error:', error.message);
      return [];
    }
  }

  /**
   * Approve a review (Admin only)
   */
  async approve(reviewId: string, adminId: string): Promise<Review> {
    const storage = this.getPreferredStorage();
    const now = new Date().toISOString();
    let review: Review;

    if (storage === 'supabase') {
      try {
        // Use admin client to bypass RLS for admin operations
        const supabaseClient = this.supabaseService.getAdminClient() || this.supabaseService.getClient();
        
        // First check if review exists
        const { data: existingReview, error: checkError } = await supabaseClient
          .from('reviews')
          .select('*')
          .eq('id', reviewId)
          .maybeSingle();

        console.log(`🔍 [ReviewsService] approve: Checking review ${reviewId}`);
        console.log(`   Review exists:`, !!existingReview);
        console.log(`   Check error:`, checkError);
        console.log(`   Current status:`, existingReview?.status);
        console.log(`   Using admin client: ${!!this.supabaseService.getAdminClient()}`);

        if (checkError || !existingReview) {
          console.log(`❌ [ReviewsService] approve: Review ${reviewId} not found`);
          throw new NotFoundException('Review not found');
        }

        if (existingReview.status !== 'pending') {
          console.log(`❌ [ReviewsService] approve: Review ${reviewId} status is '${existingReview.status}', not 'pending'`);
          throw new NotFoundException(`Review has already been ${existingReview.status}`);
        }

        console.log(`🔄 [ReviewsService] approve: Attempting to update review ${reviewId}`);
        console.log(`   Admin ID: ${adminId}`);
        console.log(`   New status: approved`);
        
        const { data, error } = await supabaseClient
          .from('reviews')
          .update({
            status: 'approved',
            approvedBy: adminId,
            approvedAt: now,
            updatedAt: now,
          })
          .eq('id', reviewId)
          .eq('status', 'pending')
          .select();

        if (error) {
          throw new NotFoundException('Review not found or already processed');
        }

        // Check if update actually affected a row (handles race conditions)
        if (!data || data.length === 0) {
          // Double-check the current status
          const { data: currentReview } = await this.supabaseService
            .getClient()
            .from('reviews')
            .select('status')
            .eq('id', reviewId)
            .maybeSingle();
          
          if (currentReview && currentReview.status !== 'pending') {
            throw new NotFoundException(`Review has already been ${currentReview.status}`);
          }
          throw new NotFoundException('Review not found or already processed');
        }

        const updatedReview = data[0];

        review = {
          ...updatedReview,
          createdAt: new Date(updatedReview.createdAt),
          updatedAt: new Date(updatedReview.updatedAt),
          approvedAt: new Date(updatedReview.approvedAt),
        };
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase approval error, falling back to SQLite:', error.message);
        review = this.approveInSqlite(reviewId, adminId);
      }
    } else {
      review = this.approveInSqlite(reviewId, adminId);
    }

    // Send email notification
    try {
      const member = await this.membersService.findOne(review.memberId);
      const book = await this.booksService.findOne(review.bookId);
      await this.emailService.sendReviewApprovalEmail(member.email, member.name, book.title, true);
    } catch (error: any) {
      console.warn('⚠️ Failed to send approval email:', error.message);
    }

    return review;
  }

  private approveInSqlite(reviewId: string, adminId: string): Review {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    // First check if review exists
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status !== 'pending') {
      throw new NotFoundException('Review not found or already processed');
    }

    db.prepare(`
      UPDATE reviews 
      SET status = 'approved', approvedBy = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(adminId, now, now, reviewId);

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      transactionId: updated.transactionId || undefined,
      review: updated.review,
      status: 'approved',
      approvedBy: updated.approvedBy,
      approvedAt: new Date(updated.approvedAt),
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }

  /**
   * Reject a review (Admin only)
   */
  async reject(reviewId: string, adminId: string, reason: string): Promise<Review> {
    const storage = this.getPreferredStorage();
    const now = new Date().toISOString();
    let review: Review;

    if (storage === 'supabase') {
      try {
        // Use admin client to bypass RLS for admin operations
        const supabaseClient = this.supabaseService.getAdminClient() || this.supabaseService.getClient();
        
        // First check if review exists
        const { data: existingReview, error: checkError } = await supabaseClient
          .from('reviews')
          .select('*')
          .eq('id', reviewId)
          .maybeSingle();

        console.log(`🔍 [ReviewsService] reject: Checking review ${reviewId}`);
        console.log(`   Review exists:`, !!existingReview);
        console.log(`   Check error:`, checkError);
        console.log(`   Current status:`, existingReview?.status);
        console.log(`   Using admin client: ${!!this.supabaseService.getAdminClient()}`);

        if (checkError || !existingReview) {
          console.log(`❌ [ReviewsService] reject: Review ${reviewId} not found`);
          throw new NotFoundException('Review not found');
        }

        if (existingReview.status !== 'pending') {
          console.log(`❌ [ReviewsService] reject: Review ${reviewId} status is '${existingReview.status}', not 'pending'`);
          throw new NotFoundException(`Review has already been ${existingReview.status}`);
        }

        console.log(`🔄 [ReviewsService] reject: Attempting to update review ${reviewId}`);
        console.log(`   Admin ID: ${adminId}`);
        console.log(`   Rejection reason: ${reason}`);
        console.log(`   New status: rejected`);
        
        const { data, error } = await supabaseClient
          .from('reviews')
          .update({
            status: 'rejected',
            approvedBy: adminId,
            rejectionReason: reason,
            approvedAt: now,
            updatedAt: now,
          })
          .eq('id', reviewId)
          .eq('status', 'pending')
          .select();

        console.log(`📊 [ReviewsService] reject: Update result for review ${reviewId}`);
        console.log(`   Error:`, error);
        console.log(`   Data returned:`, data ? `${data.length} row(s)` : 'null');
        console.log(`   Data content:`, data);

        if (error) {
          console.log(`❌ [ReviewsService] reject: Update error for review ${reviewId}:`, error);
          throw new NotFoundException('Review not found or already processed');
        }

        // Check if update actually affected a row (handles race conditions)
        if (!data || data.length === 0) {
          console.log(`⚠️ [ReviewsService] reject: Update returned 0 rows for review ${reviewId}`);
          // Double-check the current status
          const { data: currentReview, error: statusError } = await supabaseClient
            .from('reviews')
            .select('id, status, updatedAt')
            .eq('id', reviewId)
            .maybeSingle();
          
          console.log(`⚠️ [ReviewsService] reject: Update returned 0 rows for review ${reviewId}`);
          console.log(`   Current review status:`, currentReview ? currentReview.status : 'NOT FOUND');
          console.log(`   Status check error:`, statusError);
          
          if (!currentReview) {
            throw new NotFoundException('Review not found');
          }
          
          if (currentReview.status !== 'pending') {
            throw new NotFoundException(`Review has already been ${currentReview.status}`);
          }
          
          // If status is still pending but update failed, there might be a database issue
          throw new NotFoundException('Review not found or already processed');
        }

        const updatedReview = data[0];
        console.log(`✅ [ReviewsService] reject: Successfully rejected review ${reviewId}`);

        review = {
          ...updatedReview,
          createdAt: new Date(updatedReview.createdAt),
          updatedAt: new Date(updatedReview.updatedAt),
          approvedAt: new Date(updatedReview.approvedAt),
          rejectionReason: updatedReview.rejectionReason,
        };
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase rejection error, falling back to SQLite:', error.message);
        review = this.rejectInSqlite(reviewId, adminId, reason);
      }
    } else {
      review = this.rejectInSqlite(reviewId, adminId, reason);
    }

    // Send email notification
    try {
      const member = await this.membersService.findOne(review.memberId);
      const book = await this.booksService.findOne(review.bookId);
      await this.emailService.sendReviewApprovalEmail(member.email, member.name, book.title, false, reason);
    } catch (error: any) {
      console.warn('⚠️ Failed to send rejection email:', error.message);
    }

    return review;
  }

  private rejectInSqlite(reviewId: string, adminId: string, reason: string): Review {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date().toISOString();

    // First check if review exists
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status !== 'pending') {
      throw new NotFoundException('Review not found or already processed');
    }

    db.prepare(`
      UPDATE reviews 
      SET status = 'rejected', approvedBy = ?, rejectionReason = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(adminId, reason, now, now, reviewId);

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      transactionId: updated.transactionId || undefined,
      review: updated.review,
      status: 'rejected',
      rejectionReason: updated.rejectionReason,
      approvedBy: updated.approvedBy,
      approvedAt: new Date(updated.approvedAt),
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }
}
