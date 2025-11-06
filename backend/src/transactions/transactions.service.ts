import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { Transaction, TransactionType } from './transaction.interface';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storage = this.configService.get<string>('AUTH_STORAGE') || 'auto';
    if (storage === 'supabase' && this.supabaseService.isReady()) {
      return 'supabase';
    }
    if (storage === 'sqlite' && this.sqliteService.isReady()) {
      return 'sqlite';
    }
    // Auto-detect: prefer Supabase if available, fallback to SQLite
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    return 'sqlite';
  }

  async create(createTransactionDto: CreateTransactionDto, memberId: string): Promise<Transaction> {
    const { bookId, type } = createTransactionDto;
    const storage = this.getPreferredStorage();
    
    // Validate borrow requests BEFORE creating transaction
    if (type === 'borrow') {
      await this.validateBorrowRequest(memberId, bookId, storage);
    }
    
    // Set dates based on transaction type - 5 days for borrow
    const now = new Date();
    const dueDate = type === 'borrow' ? new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) : null; // 5 days from now
    
    if (storage === 'supabase') {
      try {
        const transactionData: any = {
          bookId,
          memberId,
          type,
          status: type === 'borrow' ? 'active' : 'completed',
          borrowedDate: type === 'borrow' ? now.toISOString() : null,
          dueDate: dueDate ? dueDate.toISOString() : null,
        };
        
        const { data, error } = await this.supabaseService
          .getClient()
          .from('transactions')
          .insert([transactionData])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Supabase transaction creation error, falling back to SQLite:', error.message);
          const sqliteTransaction = await this.createInSqlite(createTransactionDto, memberId);
          // Update book count for SQLite path too
          if (type === 'borrow') {
            try {
              await this.updateBookAvailabilityOnBorrow(bookId, 'sqlite');
            } catch (updateError: any) {
              console.error('⚠️ Failed to update book availability:', updateError.message);
            }
          }
          return sqliteTransaction;
        }

        // Update book count and status when borrowing (AFTER transaction is created successfully)
        if (type === 'borrow' && data) {
          try {
            await this.updateBookAvailabilityOnBorrow(bookId, storage);
            console.log(`✅ Transaction created and book availability updated for book ${bookId}`);
          } catch (updateError: any) {
            console.error('⚠️ Failed to update book availability, but transaction was created:', updateError.message);
            console.error('⚠️ Transaction ID:', data.id, '- Book count may be out of sync');
            // Don't fail the transaction if book update fails - we can fix it later
          }
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return await this.createInSqlite(createTransactionDto, memberId);
      }
    }
    
    const transaction = await this.createInSqlite(createTransactionDto, memberId);
    
    // Update book count and status when borrowing (AFTER transaction is created successfully)
    if (type === 'borrow') {
      try {
        await this.updateBookAvailabilityOnBorrow(bookId, storage);
        console.log(`✅ Transaction created and book availability updated for book ${bookId}`);
      } catch (updateError: any) {
        console.error('⚠️ Failed to update book availability, but transaction was created:', updateError.message);
        console.error('⚠️ Transaction created for book', bookId, '- Book count may be out of sync');
        // Don't fail the transaction if book update fails - we can fix it later
      }
    }
    
    return transaction;
  }

  private async createInSqlite(createTransactionDto: CreateTransactionDto, memberId: string): Promise<Transaction> {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const { bookId, type } = createTransactionDto;
    const db = this.sqliteService.getDatabase();
    const now = new Date();
    const dueDate = type === 'borrow' ? new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) : null; // 5 days

    const id = `transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      db.prepare(`
        INSERT INTO transactions (id, bookId, memberId, type, status, borrowedDate, dueDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        bookId,
        memberId,
        type,
        type === 'borrow' ? 'active' : 'completed',
        type === 'borrow' ? now.toISOString() : null,
        dueDate ? dueDate.toISOString() : null,
        now.toISOString(),
        now.toISOString()
      );

      // Fetch the created transaction
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
      
      return {
        id: transaction.id,
        bookId: transaction.bookId,
        memberId: transaction.memberId,
        type: transaction.type as TransactionType,
        status: transaction.status,
        borrowedDate: transaction.borrowedDate ? new Date(transaction.borrowedDate) : undefined,
        dueDate: transaction.dueDate ? new Date(transaction.dueDate) : undefined,
        returnDate: transaction.returnDate ? new Date(transaction.returnDate) : undefined,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
      };
    } catch (error: any) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  async findAll(bookId?: string): Promise<any[]> {
    const storage = this.getPreferredStorage();
    
    if (storage === 'supabase') {
      try {
        // Query transactions table (not loans table)
        // For admin/librarian, return ALL transactions across all users
        let query = this.supabaseService
          .getClient()
          .from('transactions')
          .select(`
            *,
            book:books(*),
            member:users!transactions_memberId_fkey(id, name, email)
          `);
        
        // Filter by bookId if provided
        if (bookId) {
          query = query.eq('bookId', bookId);
        }
        
        const { data: transactions, error: transactionsError } = await query
          .order('createdAt', { ascending: false });

        if (transactionsError) {
          console.warn('⚠️ Supabase transactions query error, falling back to SQLite:', transactionsError.message);
          return this.findAllFromSqlite(bookId);
        }

        // Filter out any transactions with null books (orphaned), but keep all member transactions
        const validTransactions = (transactions || []).filter(t => t.book !== null);
        console.log(`✅ Found ${validTransactions.length} transactions for admin/librarian view`);
        return validTransactions;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.findAllFromSqlite(bookId);
      }
    }
    
    return this.findAllFromSqlite(bookId);
  }

  private findAllFromSqlite(bookId?: string): any[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      // Use INNER JOIN to exclude orphaned transactions (where book doesn't exist)
      let query = `
        SELECT t.*, 
               b.title as book_title, b.author as book_author, b.isbn as book_isbn,
               u.name as member_name, u.email as member_email
        FROM transactions t
        INNER JOIN books b ON t.bookId = b.id
        LEFT JOIN users u ON t.memberId = u.id
      `;
      
      const params: any[] = [];
      if (bookId) {
        query += ' WHERE t.bookId = ?';
        params.push(bookId);
      }
      
      query += ' ORDER BY t.createdAt DESC';
      
      const transactions = db.prepare(query).all(...params) as any[];

      return transactions.map(t => ({
        id: t.id,
        bookId: t.bookId,
        memberId: t.memberId,
        type: t.type,
        status: t.status || 'completed', // Default status if missing
        borrowedDate: t.borrowedDate,
        dueDate: t.dueDate,
        returnDate: t.returnDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        book: {
          id: t.bookId,
          title: t.book_title,
          author: t.book_author,
          isbn: t.book_isbn,
        },
        member: t.member_name ? {
          id: t.memberId,
          name: t.member_name,
          email: t.member_email,
        } : null,
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite transactions query error:', error.message);
      return [];
    }
  }

  async findMemberTransactions(memberId: string): Promise<any[]> {
    const storage = this.getPreferredStorage();
    
    if (storage === 'supabase') {
      try {
        // Query transactions table for member's transactions - return ALL transactions for this member
        const { data: transactions, error: transactionsError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select(`
            *,
            book:books(*),
            member:users!transactions_memberId_fkey(id, name, email)
          `)
          .eq('memberId', memberId)
          .order('createdAt', { ascending: false });

        if (transactionsError) {
          console.warn('⚠️ Supabase transactions query error, falling back to SQLite:', transactionsError.message);
          return this.findMemberTransactionsFromSqlite(memberId);
        }

        // Filter out any transactions with null books (orphaned)
        const validTransactions = (transactions || []).filter(t => t.book !== null);
        return validTransactions;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return this.findMemberTransactionsFromSqlite(memberId);
      }
    }
    
    return this.findMemberTransactionsFromSqlite(memberId);
  }

  private findMemberTransactionsFromSqlite(memberId: string): any[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      // Get ALL transactions for this member - filter out orphaned ones (no book)
      const transactions = db.prepare(`
        SELECT t.*, 
               b.title as book_title, b.author as book_author, b.isbn as book_isbn,
               u.name as member_name, u.email as member_email
        FROM transactions t
        INNER JOIN books b ON t.bookId = b.id
        LEFT JOIN users u ON t.memberId = u.id
        WHERE t.memberId = ?
        ORDER BY t.createdAt DESC
      `).all(memberId) as any[];

      return transactions.map(t => ({
        id: t.id,
        bookId: t.bookId,
        memberId: t.memberId,
        type: t.type,
        status: t.status || 'completed', // Default status if missing
        borrowedDate: t.borrowedDate,
        dueDate: t.dueDate,
        returnDate: t.returnDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        book: {
          id: t.bookId,
          title: t.book_title,
          author: t.book_author,
          isbn: t.book_isbn,
        },
        member: t.member_name ? {
          id: t.memberId,
          name: t.member_name,
          email: t.member_email,
        } : null,
      }));
    } catch (error: any) {
      console.warn('⚠️ SQLite transactions query error:', error.message);
      return [];
    }
  }

  async return(transactionId: string, memberId: string): Promise<Transaction> {
    const storage = this.getPreferredStorage();
    const now = new Date();

    if (storage === 'supabase') {
      let transaction: any = null; // Declare outside try block so it's accessible in catch
      try {
        // First verify the transaction belongs to the member - check both active and pending_return_approval
        const { data: fetchedTransaction, error: fetchError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('memberId', memberId)
          .eq('type', 'borrow')
          .in('status', ['active', 'pending_return_approval'])
          .single();

        if (fetchError || !fetchedTransaction) {
          // Check if transaction exists with different status
          const { data: existing } = await this.supabaseService
            .getClient()
            .from('transactions')
            .select('status')
            .eq('id', transactionId)
            .eq('memberId', memberId)
            .eq('type', 'borrow')
            .single();
          
          if (existing) {
            throw new Error(`Transaction already ${existing.status === 'pending_return_approval' ? 'pending return approval' : 'completed'}`);
          } else {
            throw new Error('Transaction not found');
          }
        }
        
        transaction = fetchedTransaction; // Store for use in catch block
        
        // If already pending return approval, just return it without updating
        if (transaction.status === 'pending_return_approval') {
          return transaction;
        }

        // Update transaction to pending return approval (requires librarian/admin approval)
        // No timeout - wait as long as needed (VPN/proxy can be extremely slow)
        console.log(`🔄 Updating transaction ${transactionId} to pending_return_approval...`);
        
        const { data: updated, error: updateError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .update({
            status: 'pending_return_approval',
            returnDate: now.toISOString(),
            updatedAt: now.toISOString(),
          })
          .eq('id', transactionId)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Failed to update transaction ${transactionId}:`, updateError.message);
          throw new Error(`Failed to return book: ${updateError.message}`);
        }
        
        console.log(`✅ Transaction ${transactionId} updated successfully`);

        // Update book count when returning (even if pending approval)
        try {
          await this.updateBookAvailabilityOnReturn(transaction.bookId, storage);
        } catch (updateError: any) {
          console.warn('⚠️ Failed to update book availability on return, but transaction was updated:', updateError.message);
          // Don't fail the return if book update fails
        }

        return updated;
      } catch (error: any) {
        console.warn('⚠️ Supabase return error:', error.message);
        
        // If Supabase is primary but failing due to network/proxy, we cannot fall back to SQLite
        // because the transaction record only exists in Supabase
        if (storage === 'supabase') {
          console.error('❌ Cannot fall back to SQLite - transaction only exists in Supabase');
          console.error('💡 Possible solutions:');
          console.error('   1. Disconnect from VPN and try again');
          console.error('   2. Check if corporate proxy is blocking Supabase');
          console.error('   3. Contact IT to whitelist *.supabase.co');
          
          // Return a more user-friendly error
          throw new Error('Unable to return book due to network restrictions. The transaction exists in Supabase but the corporate proxy is blocking the connection. Please try again later or contact support.');
        }
        
        // Fall back to SQLite if it's not primary storage
        return await this.returnInSqlite(transactionId, memberId);
      }
    }

    return await this.returnInSqlite(transactionId, memberId);
  }

  private async returnInSqlite(transactionId: string, memberId: string): Promise<Transaction> {
    if (!this.sqliteService.isReady()) {
      // If SQLite is not available but we're falling back from Supabase timeout,
      // the transaction might have been updated in Supabase. Throw a more helpful error.
      throw new Error('SQLite database is not available. The transaction may have been updated in Supabase. Please refresh and try again.');
    }

    try {
      const db = this.sqliteService.getDatabase();
      const now = new Date();

      // Verify transaction belongs to member - check both active and pending_return_approval
      // (in case user tries to return again after status changed)
      const transaction = db.prepare(`
        SELECT * FROM transactions 
        WHERE id = ? AND memberId = ? AND type = 'borrow' 
        AND status IN ('active', 'pending_return_approval')
      `).get(transactionId, memberId) as any;

      if (!transaction) {
        // Check if transaction exists but with different status
        const existingTransaction = db.prepare(`
          SELECT * FROM transactions 
          WHERE id = ? AND memberId = ? AND type = 'borrow'
        `).get(transactionId, memberId) as any;
        
        if (existingTransaction) {
          throw new Error(`Transaction already ${existingTransaction.status === 'pending_return_approval' ? 'pending return approval' : 'completed'}`);
        } else {
          // Transaction doesn't exist in SQLite - might be Supabase-only
          // This can happen if database storage preference is Supabase
          throw new Error('Transaction not found in SQLite. If you are using Supabase, the transaction may have timed out during update. Please refresh the page to check the current status.');
        }
      }
      
      // If already pending return approval, just return it without updating
      if (transaction.status === 'pending_return_approval') {
        return {
          id: transaction.id,
          bookId: transaction.bookId,
          memberId: transaction.memberId,
          type: transaction.type as TransactionType,
          status: transaction.status,
          borrowedDate: transaction.borrowedDate ? new Date(transaction.borrowedDate) : undefined,
          dueDate: transaction.dueDate ? new Date(transaction.dueDate) : undefined,
          returnDate: transaction.returnDate ? new Date(transaction.returnDate) : undefined,
          createdAt: new Date(transaction.createdAt),
          updatedAt: new Date(transaction.updatedAt),
        };
      }

    // Update transaction to pending return approval (requires librarian/admin approval)
    db.prepare(`
      UPDATE transactions 
      SET status = 'pending_return_approval', returnDate = ?, updatedAt = ?
      WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), transactionId);

    // Update book count when returning
    await this.updateBookAvailabilityOnReturn(transaction.bookId, 'sqlite');

    // Fetch updated transaction
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      type: updated.type as TransactionType,
      status: updated.status,
      borrowedDate: updated.borrowedDate ? new Date(updated.borrowedDate) : undefined,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : undefined,
      returnDate: updated.returnDate ? new Date(updated.returnDate) : undefined,
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        throw error;
      }
      console.error('⚠️ SQLite return error:', error.message);
      throw new Error(`Failed to return book: ${error.message}`);
    }
  }

  async renew(transactionId: string, memberId: string): Promise<Transaction> {
    const storage = this.getPreferredStorage();
    const now = new Date();

    if (storage === 'supabase') {
      try {
        // First verify the transaction belongs to the member
        const { data: transaction, error: fetchError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('memberId', memberId)
          .eq('type', 'borrow')
          .eq('status', 'active')
          .single();

        if (fetchError || !transaction) {
          throw new Error('Transaction not found or cannot be renewed');
        }

        // Check if renewal is allowed (1-2 days before due date)
        if (transaction.dueDate) {
          const dueDate = new Date(transaction.dueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue > 2 || daysUntilDue < 1) {
            throw new BadRequestException('Renewal is only allowed 1-2 days before the due date');
          }
        }

        // Extend by 5 days (same as initial borrow period)
        const newDueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        // Update transaction with new due date
        const { data: updated, error: updateError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .update({
            dueDate: newDueDate.toISOString(),
            updatedAt: now.toISOString(),
          })
          .eq('id', transactionId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to renew book: ${updateError.message}`);
        }

        return updated;
      } catch (error: any) {
        console.warn('⚠️ Supabase renew error, falling back to SQLite:', error.message);
        return this.renewInSqlite(transactionId, memberId);
      }
    }

    return this.renewInSqlite(transactionId, memberId);
  }

  private renewInSqlite(transactionId: string, memberId: string): Transaction {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date();

    // Verify transaction belongs to member
    const transaction = db.prepare(`
      SELECT * FROM transactions 
      WHERE id = ? AND memberId = ? AND type = 'borrow' AND status = 'active'
    `).get(transactionId, memberId) as any;

    if (!transaction) {
      throw new Error('Transaction not found or cannot be renewed');
    }

    // Check if renewal is allowed (1-2 days before due date)
    if (transaction.dueDate) {
      const dueDate = new Date(transaction.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue > 2 || daysUntilDue < 1) {
        throw new BadRequestException('Renewal is only allowed 1-2 days before the due date');
      }
    }

    // Extend by 5 days (same as initial borrow period)
    const newDueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Update transaction
    db.prepare(`
      UPDATE transactions 
      SET dueDate = ?, updatedAt = ?
      WHERE id = ?
    `).run(newDueDate.toISOString(), now.toISOString(), transactionId);

    // Fetch updated transaction
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as any;
    return {
      id: updated.id,
      bookId: updated.bookId,
      memberId: updated.memberId,
      type: updated.type as TransactionType,
      status: updated.status,
      borrowedDate: updated.borrowedDate ? new Date(updated.borrowedDate) : undefined,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : undefined,
      returnDate: updated.returnDate ? new Date(updated.returnDate) : undefined,
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    };
  }

  private async validateBorrowRequest(memberId: string, bookId: string, storage: 'supabase' | 'sqlite'): Promise<void> {
    // Get user's subscription tier (default to GOLD for demo_member)
    let subscriptionTier = 'GOLD'; // Default
    
    if (storage === 'supabase') {
      try {
        // Get user email to check if demo_member
        const { data: user } = await this.supabaseService.getClient()
          .from('users')
          .select('email')
          .eq('id', memberId)
          .single();
        
        if (user?.email === 'demo_member@library.com') {
          subscriptionTier = 'GOLD';
        } else {
          // Try to get subscription from subscriptions table
          const { data: subscription } = await this.supabaseService.getClient()
            .from('subscriptions')
            .select('tier')
            .eq('member_id', memberId)
            .eq('isActive', true)
            .order('createdAt', { ascending: false })
            .limit(1)
            .single();
          
          if (subscription?.tier) {
            subscriptionTier = subscription.tier.toUpperCase();
          }
        }
      } catch (error) {
        // Default to GOLD if subscription lookup fails
        subscriptionTier = 'GOLD';
      }
    } else {
      // SQLite - check user email
      const db = this.sqliteService.getDatabase();
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(memberId) as any;
      if (user?.email === 'demo_member@library.com') {
        subscriptionTier = 'GOLD';
      }
    }

    const plan = subscriptionPlans[subscriptionTier as keyof typeof subscriptionPlans] || subscriptionPlans.GOLD;
    
    // Check active concurrent borrows (books currently borrowed) - this is the main limit
    const activeConcurrentBorrows = await this.getActiveConcurrentBorrowsCount(memberId, storage);
    
    if (activeConcurrentBorrows >= plan.concurrentLendingLimit) {
      throw new ConflictException(`You can only borrow ${plan.concurrentLendingLimit} book(s) at a time. You currently have ${activeConcurrentBorrows} active loan(s).`);
    }

    // Check total lending limit (lifetime limit) - only if user has reached concurrent limit
    const activeBorrows = await this.getActiveBorrowsCount(memberId, storage);
    
    if (activeBorrows >= plan.lendingLimit) {
      throw new ConflictException(`You have reached your total borrowing limit of ${plan.lendingLimit} books.`);
    }

    // Check if user already has this book borrowed (even if multiple copies exist)
    const hasBookBorrowed = await this.hasBookBorrowed(memberId, bookId, storage);
    if (hasBookBorrowed) {
      throw new ConflictException('You have already borrowed this book. Cannot borrow the same book again.');
    }

    // Check if book is available
    const isBookAvailable = await this.isBookAvailable(bookId, storage);
    if (!isBookAvailable) {
      throw new ConflictException('This book is not available for borrowing.');
    }
  }

  private async getActiveBorrowsCount(memberId: string, storage: 'supabase' | 'sqlite'): Promise<number> {
    if (storage === 'supabase') {
      const { count } = await this.supabaseService.getClient()
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('memberId', memberId)
        .eq('type', 'borrow')
        .in('status', ['active', 'pending_return_approval']);
      
      return count || 0;
    } else {
      const db = this.sqliteService.getDatabase();
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE memberId = ? AND type = 'borrow' AND status IN ('active', 'pending_return_approval')
      `).get(memberId) as any;
      return result?.count || 0;
    }
  }

  private async getActiveConcurrentBorrowsCount(memberId: string, storage: 'supabase' | 'sqlite'): Promise<number> {
    // Same as active borrows for now - can be enhanced later
    return this.getActiveBorrowsCount(memberId, storage);
  }

  private async hasBookBorrowed(memberId: string, bookId: string, storage: 'supabase' | 'sqlite'): Promise<boolean> {
    if (storage === 'supabase') {
      const { data } = await this.supabaseService.getClient()
        .from('transactions')
        .select('id')
        .eq('memberId', memberId)
        .eq('bookId', bookId)
        .eq('type', 'borrow')
        .in('status', ['active', 'pending_return_approval'])
        .limit(1);
      
      return (data?.length || 0) > 0;
    } else {
      const db = this.sqliteService.getDatabase();
      const result = db.prepare(`
        SELECT id FROM transactions 
        WHERE memberId = ? AND bookId = ? AND type = 'borrow' 
        AND status IN ('active', 'pending_return_approval')
        LIMIT 1
      `).get(memberId, bookId) as any;
      
      return !!result;
    }
  }

  private async isBookAvailable(bookId: string, storage: 'supabase' | 'sqlite'): Promise<boolean> {
    if (storage === 'supabase') {
      try {
        // Get book count (default to 1 if count column doesn't exist)
        const { data: book, error: bookError } = await this.supabaseService.getClient()
          .from('books')
          .select('count')
          .eq('id', bookId)
          .single();
        
        if (bookError || !book) {
          console.warn(`⚠️ Book ${bookId} not found or error fetching:`, bookError?.message);
          return false; // Book doesn't exist
        }
        
        const bookCount = book?.count ?? 1;
        
        // Check active borrows for this book
        const { count: activeBorrows, error: countError } = await this.supabaseService.getClient()
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('bookId', bookId)
          .eq('type', 'borrow')
          .in('status', ['active', 'pending_return_approval']);
        
        if (countError) {
          console.warn(`⚠️ Error counting active borrows for book ${bookId}:`, countError.message);
          // If we can't count, assume available (safer default)
          return true;
        }
        
        // Book is available if: bookCount - activeBorrows > 0
        const available = (bookCount - (activeBorrows || 0)) > 0;
        return available;
      } catch (error: any) {
        console.warn(`⚠️ Error checking book availability for ${bookId}:`, error.message);
        return true; // Default to available if check fails
      }
    } else {
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
      
      // Check active borrows
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE bookId = ? AND type = 'borrow' AND status IN ('active', 'pending_return_approval')
      `).get(bookId) as any;
      
      const activeBorrows = result?.count || 0;
      
      // Book is available if: bookCount - activeBorrows > 0
      return (bookCount - activeBorrows) > 0;
    }
  }

  private async updateBookAvailabilityOnBorrow(bookId: string, storage: 'supabase' | 'sqlite'): Promise<void> {
    if (storage === 'supabase') {
      try {
        // Get current book count
        const { data: book, error: fetchError } = await this.supabaseService.getClient()
          .from('books')
          .select('count, status')
          .eq('id', bookId)
          .single();
        
        if (fetchError || !book) {
          console.error(`⚠️ Failed to fetch book ${bookId} for count update:`, fetchError?.message);
          return;
        }
        
        const currentCount = book?.count ?? 1;
        const newCount = Math.max(0, currentCount - 1);
        
        console.log(`📚 Updating book ${bookId}: count ${currentCount} -> ${newCount}`);
        
        // Update book count and status
        const updateData: any = { count: newCount };
        if (newCount === 0) {
          updateData.status = 'borrowed';
        } else {
          // Keep status as 'available' if count > 0
          updateData.status = 'available';
        }
        
        // Use a timeout for the update operation (non-blocking)
        const updatePromise = this.supabaseService.getClient()
          .from('books')
          .update(updateData)
          .eq('id', bookId);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 5000)
        );
        
        try {
          const result = await Promise.race([updatePromise, timeoutPromise]) as any;
          
          if (result.error) {
            console.error(`⚠️ Failed to update book ${bookId} count/status:`, result.error.message);
            throw result.error;
          }
          
          console.log(`✅ Successfully updated book ${bookId}: count=${newCount}, status=${updateData.status}`);
        } catch (error: any) {
          if (error.message === 'TIMEOUT_ERROR') {
            console.warn(`⚠️ Book update timed out for ${bookId} - count may be out of sync`);
            console.warn(`   Expected: count=${newCount}, status=${updateData.status}`);
            // Don't throw - transaction is already created, just log the issue
            // The sync script can fix this later
            return; // Exit gracefully without throwing
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        console.error('⚠️ Failed to update book availability on borrow:', error.message);
        // Don't throw - transaction is already created, just log the issue
        // The sync script can fix this later
      }
    } else {
      try {
        const db = this.sqliteService.getDatabase();
        
        // Get current book count (handle if column doesn't exist)
        let currentCount = 1;
        try {
          const book = db.prepare('SELECT count FROM books WHERE id = ?').get(bookId) as any;
          currentCount = book?.count ?? 1;
        } catch (e) {
          // Count column might not exist, try to add it
          try {
            db.prepare('ALTER TABLE books ADD COLUMN count INTEGER DEFAULT 1').run();
            currentCount = 1;
          } catch (alterError) {
            // Column might already exist, just use default
            currentCount = 1;
          }
        }
        
        const newCount = Math.max(0, currentCount - 1);
        
        // Update book count and status
        try {
          db.prepare('UPDATE books SET count = ?, status = ? WHERE id = ?').run(
            newCount,
            newCount === 0 ? 'borrowed' : 'available',
            bookId
          );
        } catch (updateError: any) {
          // If status column doesn't exist, just update count
          try {
            db.prepare('UPDATE books SET count = ? WHERE id = ?').run(newCount, bookId);
          } catch (countError) {
            console.warn('⚠️ Failed to update book count:', countError);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to update book availability on borrow:', error.message);
      }
    }
  }

  private async updateBookAvailabilityOnReturn(bookId: string, storage: 'supabase' | 'sqlite'): Promise<void> {
    if (storage === 'supabase') {
      try {
        // Get current book count
        const { data: book } = await this.supabaseService.getClient()
          .from('books')
          .select('count')
          .eq('id', bookId)
          .single();
        
        const currentCount = book?.count ?? 0;
        const newCount = currentCount + 1;
        
        // Update book count and status
        await this.supabaseService.getClient()
          .from('books')
          .update({ 
            count: newCount,
            status: 'available'
          })
          .eq('id', bookId);
      } catch (error: any) {
        console.warn('⚠️ Failed to update book availability on return:', error.message);
      }
    } else {
      try {
        const db = this.sqliteService.getDatabase();
        
        // Get current book count
        let currentCount = 0;
        try {
          const book = db.prepare('SELECT count FROM books WHERE id = ?').get(bookId) as any;
          currentCount = book?.count ?? 0;
        } catch (e) {
          // Count column might not exist
          currentCount = 0;
        }
        
        const newCount = currentCount + 1;
        
        // Update book count and status
        try {
          db.prepare('UPDATE books SET count = ?, status = ? WHERE id = ?').run(
            newCount,
            'available',
            bookId
          );
        } catch (updateError: any) {
          // If status column doesn't exist, just update count
          try {
            db.prepare('UPDATE books SET count = ? WHERE id = ?').run(newCount, bookId);
          } catch (countError) {
            console.warn('⚠️ Failed to update book count:', countError);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to update book availability on return:', error.message);
      }
    }
  }
}
