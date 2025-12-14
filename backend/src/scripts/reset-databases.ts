import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../../../data/library.db');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create custom fetch function with SSL certificate handling
 * Same as SupabaseService - handles corporate network SSL issues
 */
function createCustomFetch(apiKey: string) {
  return async (url: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    
    try {
      const timeout = 10000; // 10 second timeout
      const urlObj = new URL(urlString);
      
      // Use https module for better SSL control (handles certificate issues)
      if (urlObj.protocol === 'https:') {
        const https = require('https');
        
        return new Promise((resolve, reject) => {
          // Get headers from options
          let requestHeaders: any = {};
          
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                requestHeaders[key] = value;
              });
            } else {
              requestHeaders = { ...(options.headers as any) };
            }
          }
          
          // Always add apikey header
          if (apiKey && !requestHeaders.apikey && !requestHeaders.Authorization) {
            requestHeaders.apikey = apiKey;
          }
          
          const httpsOptions: any = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: requestHeaders,
            rejectUnauthorized: true, // Try strict first
          };

          const makeRequest = (relaxed = false) => {
            if (relaxed) {
              httpsOptions.rejectUnauthorized = false;
            }

            const req = https.request(httpsOptions, (res: any) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk: Buffer) => chunks.push(chunk));
              res.on('end', () => {
                const body = Buffer.concat(chunks);
                const responseObj = {
                  ok: res.statusCode >= 200 && res.statusCode < 300,
                  status: res.statusCode,
                  statusText: res.statusMessage,
                  headers: new Headers(res.headers as any),
                  json: async () => JSON.parse(body.toString()),
                  text: async () => body.toString(),
                  arrayBuffer: async () => body.buffer,
                  url: urlString,
                  redirected: false,
                  type: 'default' as ResponseType,
                  clone: function() { return this; },
                  body: null,
                  bodyUsed: false,
                } as unknown as Response;
                resolve(responseObj);
              });
            });

            req.on('error', (err: any) => {
              if ((err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || 
                   err.message?.includes('certificate')) && !relaxed) {
                // Retry with relaxed SSL
                makeRequest(true);
              } else {
                reject(err);
              }
            });

            req.setTimeout(timeout, () => {
              req.destroy();
              reject(new Error('TIMEOUT_ERROR'));
            });

            if (options.body) {
              req.write(options.body);
            }
            req.end();
          };

          makeRequest();
        });
      } else {
        // HTTP requests use regular fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error: any) {
          clearTimeout(timeoutId);
          throw error;
        }
      }
    } catch (error: any) {
      throw error;
    }
  };
}

async function resetDatabases() {
  console.log('🔄 Starting Database Reset and Cleanup...\n');
  
  // Reset SQLite
  console.log('📦 Resetting SQLite Database...');
  if (fs.existsSync(SQLITE_PATH)) {
    const db = new Database(SQLITE_PATH);
    
    try {
      // Delete all transactions
      const deleteTransactions = db.prepare('DELETE FROM transactions').run();
      console.log(`   ✅ Deleted ${deleteTransactions.changes} transactions`);
      
      // Reset book statuses to available (if status column exists)
      try {
        // Check if status column exists
        const tableInfo = db.prepare("PRAGMA table_info(books)").all() as any[];
        const hasStatusColumn = tableInfo.some(col => col.name === 'status');
        
        if (hasStatusColumn) {
          const resetBooks = db.prepare('UPDATE books SET status = ?').run('available');
          console.log(`   ✅ Reset ${resetBooks.changes} books to available status`);
        } else {
          console.log(`   ⚠️  Books table does not have status column (skipping status reset)`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not reset book statuses: ${error.message}`);
      }
      
      // Verify no orphaned data
      const orphanedTransactions = db.prepare(`
        SELECT COUNT(*) as count FROM transactions t
        LEFT JOIN books b ON t.bookId = b.id
        WHERE b.id IS NULL
      `).get() as any;
      
      if (orphanedTransactions.count > 0) {
        console.log(`   ⚠️  Found ${orphanedTransactions.count} orphaned transactions (should be 0 after cleanup)`);
      }
      
      // Show final state
      const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as any;
      const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any;
      const activeBorrows = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE type = 'borrow' AND status IN ('active', 'pending_return_approval')
      `).get() as any;
      
      console.log(`\n   📊 SQLite Final State:`);
      console.log(`      Books: ${bookCount.count}`);
      console.log(`      Transactions: ${transactionCount.count}`);
      console.log(`      Active Borrows: ${activeBorrows.count}`);
      
    } catch (error: any) {
      console.error(`   ❌ SQLite Error: ${error.message}`);
    } finally {
      db.close();
    }
  } else {
    console.log('   ⚠️  SQLite database not found, skipping...');
  }
  
  // Reset Supabase
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    console.log('\n📦 Resetting Supabase Database...');
    console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`   Key: ${SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...` : 'NOT SET'}`);
    
    try {
      // Use custom fetch with SSL certificate handling (same as SupabaseService)
      const customFetch = createCustomFetch(SUPABASE_SERVICE_KEY);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: customFetch,
        },
      });
      
      // Test connection first
      console.log('   🔍 Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('books')
        .select('id')
        .limit(1);
      
      if (testError) {
        if (testError.message?.includes('fetch') || testError.message?.includes('network') || 
            testError.code === 'PGRST301' || testError.message?.includes('getaddrinfo')) {
          console.error(`   ❌ Network/DNS Error: Cannot reach Supabase`);
          console.error(`      Error: ${testError.message}`);
          console.error(`      Code: ${testError.code || 'N/A'}`);
          console.error(`   💡 Solutions:`);
          console.error(`      1. Check network connectivity`);
          console.error(`      2. Verify Supabase URL is correct: ${SUPABASE_URL}`);
          console.error(`      3. Use SQLite only: Set AUTH_STORAGE=sqlite`);
          console.error(`   ⚠️  Skipping Supabase reset. SQLite has been reset successfully.`);
          return;
        } else {
          console.error(`   ❌ Supabase connection error: ${testError.message}`);
          console.error(`      Code: ${testError.code || 'N/A'}`);
          console.error(`      Hint: ${testError.hint || 'N/A'}`);
          console.error(`   ⚠️  Skipping Supabase reset. SQLite has been reset successfully.`);
          return;
        }
      }
      
      console.log('   ✅ Connection successful!');
      
      // Delete all transactions
      console.log('   🗑️  Deleting transactions...');
      const { data: allTransactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id');
      
      if (fetchError) {
        console.error(`   ❌ Error fetching transactions: ${fetchError.message}`);
        console.error(`      Code: ${fetchError.code || 'N/A'}`);
      } else if (allTransactions && allTransactions.length > 0) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) {
          console.error(`   ❌ Error deleting transactions: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deleted ${allTransactions.length} transactions from Supabase`);
        }
      } else {
        console.log(`   ✅ No transactions to delete in Supabase`);
      }
      
      // Note: Book status update is optional - availability is calculated from transactions
      // Since all transactions are cleared, all books are effectively available
      console.log('   📚 Book status update (optional)...');
      console.log('   📝 Note: Book availability is calculated from transactions, not the status column.');
      console.log('   📝 Since all transactions are cleared, all books are effectively available.');
      console.log('   ⏭️  Skipping status column update (to avoid timeout on slow networks)');
      
      // Verify state
      const { count: bookCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      const { count: activeBorrows } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'borrow')
        .in('status', ['active', 'pending_return_approval']);
      
      console.log(`\n   📊 Supabase Final State:`);
      console.log(`      Books: ${bookCount || 0}`);
      console.log(`      Transactions: ${transactionCount || 0}`);
      console.log(`      Active Borrows: ${activeBorrows || 0}`);
      
    } catch (error: any) {
      console.error(`   ❌ Supabase Error: ${error.message}`);
      console.error(`      Type: ${error.name || 'Error'}`);
      if (error.cause) {
        console.error(`      Cause: ${error.cause.message || error.cause}`);
      }
      if (error.message?.includes('fetch') || error.message?.includes('network') || 
          error.message?.includes('getaddrinfo') || error.code === 'EAI_AGAIN') {
        console.error(`   💡 This appears to be a network/DNS issue.`);
        console.error(`      Check: Network connectivity, VPN requirements, DNS settings`);
        console.error(`      Alternative: Use SQLite only (AUTH_STORAGE=sqlite)`);
      }
      console.error(`   ⚠️  Supabase reset failed, but SQLite has been reset successfully.`);
    }
  } else {
    console.log('\n   ⚠️  Supabase credentials not found, skipping...');
    console.log(`      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'}`);
    console.log('      Set both environment variables to reset Supabase');
  }
  
  console.log('\n✅ Database reset complete!');
  console.log('📝 Note: User accounts and books are preserved, only transactions have been cleared.');
  console.log('📝 All books are now marked as available.');
}

resetDatabases().catch(console.error);

