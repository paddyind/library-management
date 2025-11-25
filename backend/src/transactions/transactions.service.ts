import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { ConfigService } from '@nestjs/config';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { Transaction, TransactionType } from './transaction.interface';
import { subscriptionPlans } from '../config/subscription-plans';
import { MembersService } from '../members/members.service';
import { MemberRole } from '../members/member.interface';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
    private readonly membersService: MembersService,
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

  async create(createTransactionDto: CreateTransactionDto, memberId: string, userData?: { email?: string; name?: string; role?: MemberRole }): Promise<Transaction> {
    const { bookId, type } = createTransactionDto;
    const storage = this.getPreferredStorage();
    
    // ALWAYS ensure user exists in SQLite before creating transaction (for fallback support)
    // This prevents foreign key constraint errors when Supabase fails
    // Also ensure user exists in Supabase users table
    await this.ensureUserExistsInSqlite(memberId, userData);
    
    // Validate borrow requests BEFORE creating transaction
    if (type === 'borrow') {
      await this.validateBorrowRequest(memberId, bookId, storage);
    }
    
    // Set dates based on transaction type - 5 days for borrow
    const now = new Date();
    const dueDate = type === 'borrow' ? new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) : null; // 5 days from now
    
    if (storage === 'supabase') {
      try {
        // Ensure user exists in Supabase users table before creating transaction
        await this.ensureUserExistsInSupabase(memberId, userData);
        
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
          const sqliteTransaction = await this.createInSqlite(createTransactionDto, memberId, userData);
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
        return await this.createInSqlite(createTransactionDto, memberId, userData);
      }
    }
    
    const transaction = await this.createInSqlite(createTransactionDto, memberId, userData);
    
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

  private async createInSqlite(createTransactionDto: CreateTransactionDto, memberId: string, userData?: { email?: string; name?: string; role?: MemberRole }): Promise<Transaction> {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    // Ensure user exists in SQLite before creating transaction
    await this.ensureUserExistsInSqlite(memberId, userData);

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
      // Check if it's a foreign key constraint error
      if (error.message?.includes('FOREIGN KEY') || error.message?.includes('constraint')) {
        // User might not exist - try to ensure they exist and retry
        console.warn('⚠️ Foreign key constraint error, ensuring user exists and retrying...');
        
        // Retry ensuring user exists with userData
        await this.ensureUserExistsInSqlite(memberId, userData);
        
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
        } catch (retryError: any) {
          throw new Error(`Failed to create transaction after ensuring user exists: ${retryError.message}`);
        }
      }
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Ensures a user exists in both Supabase users table and SQLite before creating transactions
   * This prevents foreign key constraint errors
   */
  private async ensureUserExistsInSqlite(memberId: string, userData?: { email?: string; name?: string; role?: MemberRole }): Promise<void> {
    if (!this.sqliteService.isReady()) {
      return; // Can't ensure if SQLite is not available
    }

    // Check if user already exists in SQLite
    const sqliteUser = this.sqliteService.findUserById(memberId);
    if (sqliteUser) {
      return; // User exists, no need to create
    }

    console.warn(`⚠️ User ${memberId} not found in SQLite, creating...`);
    
    try {
      // Try to get user from Supabase first
      let user: { id: string; email: string; name: string; role: MemberRole } | null = null;
      
      if (this.supabaseService.isReady()) {
        try {
          // Use admin client to bypass RLS when querying
          const adminClient = this.supabaseService.getAdminClient();
          const { data, error } = await adminClient
            .from('users')
            .select('id, email, name, role')
            .eq('id', memberId)
            .maybeSingle();
          
          if (!error && data) {
            user = {
              id: data.id,
              email: data.email,
              name: data.name,
              role: (data.role as MemberRole) || MemberRole.MEMBER,
            };
            console.log(`✅ Found user in Supabase users table`);
          } else if (error && error.code !== 'PGRST116') {
            console.warn(`⚠️ Error querying Supabase for user:`, error.message);
          }
        } catch (supabaseError: any) {
          console.warn(`⚠️ Supabase query failed:`, supabaseError.message);
        }
      }
      
      // If not found in Supabase, try to get from MembersService (might sync)
      if (!user) {
        try {
          const member = await this.membersService.findOne(memberId);
          user = {
            id: member.id,
            email: member.email,
            name: member.name,
            role: member.role,
          };
          console.log(`✅ Found user via MembersService`);
        } catch (membersError: any) {
          // User not found in MembersService either - use provided data or create basic user
          console.warn(`⚠️ User not found in MembersService, using provided data or creating basic user`);
        }
      }
      
      // Use provided userData as fallback, or create minimal user
      const email = user?.email || userData?.email || `user-${memberId.substring(0, 8)}@example.com`;
      const name = user?.name || userData?.name || 'User';
      const role = user?.role || userData?.role || MemberRole.MEMBER;
      
      // Create user in SQLite
      const db = (this.sqliteService as any).db;
      if (db) {
        const hashedPassword = bcrypt.hashSync('SYNCED_USER', 10);
        const now = new Date().toISOString();
        
        const stmt = db.prepare(`
          INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          memberId,
          email,
          hashedPassword,
          name,
          role,
          now,
          now
        );
        console.log(`✅ Created user ${memberId} in SQLite: ${email}`);
      }
      
      // Also ensure user exists in Supabase users table if Supabase is available
      if (this.supabaseService.isReady() && !user) {
        try {
          // Use admin client to bypass RLS
          const adminClient = this.supabaseService.getAdminClient();
          const { error: insertError } = await adminClient
            .from('users')
            .insert({
              id: memberId,
              email,
              name,
              role,
            });
          
          if (!insertError) {
            console.log(`✅ Created user ${memberId} in Supabase users table`);
          } else if (insertError.code !== '23505') { // Ignore duplicate key errors
            console.warn(`⚠️ Could not create user in Supabase users table:`, insertError.message);
          }
        } catch (supabaseInsertError: any) {
          console.warn(`⚠️ Supabase insert failed:`, supabaseInsertError.message);
        }
      }
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint') || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // User was created by another request, that's fine
        console.log(`✅ User ${memberId} already exists in SQLite`);
      } else {
        console.error(`❌ Failed to ensure user ${memberId} exists:`, error.message);
        // Don't throw - we'll try to create the user again if transaction fails
      }
    }
  }

  /**
   * Ensures a user exists in Supabase users table before creating transactions
   * This prevents foreign key constraint errors in Supabase
   */
  private async ensureUserExistsInSupabase(memberId: string, userData?: { email?: string; name?: string; role?: MemberRole }): Promise<void> {
    if (!this.supabaseService.isReady()) {
      return; // Can't ensure if Supabase is not available
    }

    try {
      // Use admin client to bypass RLS for checking and creating users
      const adminClient = this.supabaseService.getAdminClient();
      
      // Check if user exists in Supabase users table
      const { data: existingUser, error: queryError } = await adminClient
        .from('users')
        .select('id')
        .eq('id', memberId)
        .maybeSingle();
      
      if (existingUser) {
        return; // User exists, no need to create
      }
      
      if (queryError && queryError.code !== 'PGRST116') {
        console.warn(`⚠️ Error checking Supabase user:`, queryError.message);
      }
      
      // User doesn't exist - try to get user data
      let email = userData?.email;
      let name = userData?.name;
      let role = userData?.role || MemberRole.MEMBER;
      
      // Try to get from MembersService if data not provided
      if (!email || !name) {
        try {
          const member = await this.membersService.findOne(memberId);
          email = member.email;
          name = member.name;
          role = member.role;
        } catch (membersError: any) {
          // Use fallback values
          email = email || `user-${memberId.substring(0, 8)}@example.com`;
          name = name || 'User';
          console.warn(`⚠️ Could not get user data from MembersService, using fallback values`);
        }
      }
      
      // Create user in Supabase users table using admin client (bypasses RLS)
      // adminClient is already defined above
      const { error: insertError } = await adminClient
        .from('users')
        .insert({
          id: memberId,
          email,
          name,
          role,
        });
      
      if (!insertError) {
        console.log(`✅ Created user ${memberId} in Supabase users table: ${email}`);
      } else if (insertError.code === '23505') {
        // Duplicate key - user was created by another request
        console.log(`✅ User ${memberId} already exists in Supabase users table`);
      } else {
        console.warn(`⚠️ Could not create user in Supabase users table:`, insertError.message);
      }
    } catch (error: any) {
      console.warn(`⚠️ Failed to ensure user exists in Supabase:`, error.message);
      // Don't throw - we'll fall back to SQLite
    }
  }

  async findAll(bookId?: string): Promise<any[]> {
    const storage = this.getPreferredStorage();
    
    if (storage === 'supabase') {
      try {
        // Query transactions table (not loans table)
        // For admin/librarian, return ALL transactions across all users
        // Use admin client to bypass RLS and see all transactions
        const adminClient = this.supabaseService.getAdminClient();
        let query = adminClient
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
        console.log(`✅ Found ${validTransactions.length} transactions for admin/librarian view (including ${validTransactions.filter(t => t.status === 'pending_return_approval').length} pending approvals)`);
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
        // First verify the transaction belongs to the member - only check active status
        // If it's already pending_return_approval, we should not allow another return request
        const { data: fetchedTransaction, error: fetchError } = await this.supabaseService
          .getClient()
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('memberId', memberId)
          .eq('type', 'borrow')
          .eq('status', 'active')  // Only allow return for active transactions
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
            .maybeSingle();
          
          if (existing) {
            if (existing.status === 'pending_return_approval') {
              throw new Error('Return request already submitted and pending approval');
            } else if (existing.status === 'completed') {
              throw new Error('Transaction already completed');
            } else {
              throw new Error(`Transaction status is ${existing.status}, cannot return`);
            }
          } else {
            throw new Error('Transaction not found');
          }
        }
        
        transaction = fetchedTransaction; // Store for use in catch block

        // Update transaction to pending return approval (requires librarian/admin approval)
        // Use admin client to bypass RLS for updates
        // No timeout - wait as long as needed (VPN/proxy can be extremely slow)
        console.log(`🔄 Updating transaction ${transactionId} to pending_return_approval...`);
        
        const adminClient = this.supabaseService.getAdminClient();
        const { data: updated, error: updateError } = await adminClient
          .from('transactions')
          .update({
            status: 'pending_return_approval',
            returnDate: now.toISOString(),
            updatedAt: now.toISOString(),
          })
          .eq('id', transactionId)
          .select()
          .maybeSingle(); // Use maybeSingle() to handle cases where no rows are returned

        if (updateError) {
          console.error(`❌ Failed to update transaction ${transactionId}:`, updateError.message);
          throw new Error(`Failed to return book: ${updateError.message}`);
        }
        
        if (!updated) {
          // Transaction might have been updated by another request, fetch it using admin client
          const { data: fetched, error: fetchError } = await adminClient
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .maybeSingle();
          
          if (fetchError || !fetched) {
            throw new Error(`Transaction ${transactionId} not found after update`);
          }
          
          console.log(`✅ Transaction ${transactionId} updated successfully (fetched after update)`);
          
          // Update book count when returning (even if pending approval)
          try {
            await this.updateBookAvailabilityOnReturn(transaction.bookId, storage);
          } catch (updateError: any) {
            console.warn('⚠️ Failed to update book availability on return, but transaction was updated:', updateError.message);
            // Don't fail the return if book update fails
          }
          
          return fetched;
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

  /**
   * Approve a pending return request (Admin/Librarian only)
   * Changes status from pending_return_approval to completed
   */
  async approveReturn(transactionId: string, approverId: string): Promise<Transaction> {
    const storage = this.getPreferredStorage();
    const now = new Date();

    if (storage === 'supabase') {
      try {
        // Verify transaction exists and is pending return approval
        const { data: transaction, error: fetchError } = await this.supabaseService
          .getAdminClient()
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('status', 'pending_return_approval')
          .eq('type', 'borrow')
          .maybeSingle();

        if (fetchError || !transaction) {
          throw new Error('Transaction not found or not pending return approval');
        }

        // Update transaction to completed
        const { data: updated, error: updateError } = await this.supabaseService
          .getAdminClient()
          .from('transactions')
          .update({
            status: 'completed',
            returnDate: now.toISOString(),
            updatedAt: now.toISOString(),
          })
          .eq('id', transactionId)
          .select()
          .maybeSingle();

        if (updateError || !updated) {
          throw new Error(`Failed to approve return: ${updateError?.message || 'Update failed'}`);
        }

        // Update book availability (increase count)
        try {
          await this.updateBookAvailabilityOnReturn(transaction.bookId, storage);
        } catch (updateError: any) {
          console.warn('⚠️ Failed to update book availability on approval, but transaction was updated:', updateError.message);
        }

        console.log(`✅ Return approved for transaction ${transactionId} by ${approverId}`);
        return updated;
      } catch (error: any) {
        console.error('❌ Failed to approve return:', error.message);
        throw error;
      }
    }

    // SQLite fallback
    return this.approveReturnInSqlite(transactionId, approverId);
  }

  private approveReturnInSqlite(transactionId: string, approverId: string): Transaction {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date();

    // Verify transaction exists and is pending return approval
    const transaction = db.prepare(`
      SELECT * FROM transactions 
      WHERE id = ? AND status = 'pending_return_approval' AND type = 'borrow'
    `).get(transactionId) as any;

    if (!transaction) {
      throw new Error('Transaction not found or not pending return approval');
    }

    // Update transaction to completed
    db.prepare(`
      UPDATE transactions 
      SET status = 'completed', returnDate = ?, updatedAt = ?
      WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), transactionId);

    // Update book availability
    try {
      this.updateBookAvailabilityOnReturn(transaction.bookId, 'sqlite');
    } catch (updateError: any) {
      console.warn('⚠️ Failed to update book availability on approval:', updateError.message);
    }

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

  /**
   * Reject a pending return request (Admin/Librarian only)
   * Changes status from pending_return_approval back to active
   */
  async rejectReturn(transactionId: string, approverId: string, reason?: string): Promise<Transaction> {
    const storage = this.getPreferredStorage();
    const now = new Date();

    if (storage === 'supabase') {
      try {
        // Verify transaction exists and is pending return approval
        const { data: transaction, error: fetchError } = await this.supabaseService
          .getAdminClient()
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('status', 'pending_return_approval')
          .eq('type', 'borrow')
          .maybeSingle();

        if (fetchError || !transaction) {
          throw new Error('Transaction not found or not pending return approval');
        }

        // Update transaction back to active
        const { data: updated, error: updateError } = await this.supabaseService
          .getAdminClient()
          .from('transactions')
          .update({
            status: 'active',
            returnDate: null, // Clear return date
            updatedAt: now.toISOString(),
          })
          .eq('id', transactionId)
          .select()
          .maybeSingle();

        if (updateError || !updated) {
          throw new Error(`Failed to reject return: ${updateError?.message || 'Update failed'}`);
        }

        console.log(`✅ Return rejected for transaction ${transactionId} by ${approverId}${reason ? ` (Reason: ${reason})` : ''}`);
        return updated;
      } catch (error: any) {
        console.error('❌ Failed to reject return:', error.message);
        throw error;
      }
    }

    // SQLite fallback
    return this.rejectReturnInSqlite(transactionId, approverId, reason);
  }

  private rejectReturnInSqlite(transactionId: string, approverId: string, reason?: string): Transaction {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    const db = this.sqliteService.getDatabase();
    const now = new Date();

    // Verify transaction exists and is pending return approval
    const transaction = db.prepare(`
      SELECT * FROM transactions 
      WHERE id = ? AND status = 'pending_return_approval' AND type = 'borrow'
    `).get(transactionId) as any;

    if (!transaction) {
      throw new Error('Transaction not found or not pending return approval');
    }

    // Update transaction back to active
    db.prepare(`
      UPDATE transactions 
      SET status = 'active', returnDate = NULL, updatedAt = ?
      WHERE id = ?
    `).run(now.toISOString(), transactionId);

    // Fetch updated transaction
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as any;
    
    console.log(`✅ Return rejected for transaction ${transactionId} by ${approverId}${reason ? ` (Reason: ${reason})` : ''}`);
    
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
}
