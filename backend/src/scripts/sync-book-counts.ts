import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function syncBookCounts() {
  console.log('🔄 Syncing book counts with active transactions...\n');
  
  const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string);
  
  try {
    // Get all books
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, count, title');
    
    if (booksError) {
      throw booksError;
    }
    
    console.log(`📚 Found ${books?.length || 0} books\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const book of books || []) {
      try {
        // Count active borrows for this book
        const { count: activeBorrows, error: countError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('bookId', book.id)
          .eq('type', 'borrow')
          .in('status', ['active', 'pending_return_approval']);
        
        if (countError) {
          console.warn(`⚠️ Error counting borrows for book ${book.id}:`, countError.message);
          errors++;
          continue;
        }
        
        const borrowCount = activeBorrows || 0;
        const originalCount = book.count ?? 1;
        const availableCount = Math.max(0, originalCount - borrowCount);
        
        // Calculate what the count should be
        // If book originally had count=1 and 1 is borrowed, count should be 0
        // But we need to know the original inventory count
        // For now, let's assume: if there are active borrows, count should be decremented
        // But we can't know the original count, so let's use a different approach:
        // Set count to max(0, currentCount - activeBorrows)
        
        // Actually, better approach: if count is null or undefined, set it to 1
        // Then calculate: newCount = max(0, count - activeBorrows)
        const currentCount = book.count ?? 1;
        const newCount = Math.max(0, currentCount - borrowCount);
        const newStatus = newCount === 0 ? 'borrowed' : 'available';
        
        // Only update if different
        if (currentCount !== newCount || (book as any).status !== newStatus) {
          const { error: updateError } = await supabase
            .from('books')
            .update({ 
              count: newCount,
              status: newStatus
            })
            .eq('id', book.id);
          
          if (updateError) {
            console.warn(`⚠️ Failed to update book ${book.id} (${book.title}):`, updateError.message);
            errors++;
          } else {
            console.log(`✅ Updated book "${book.title}" (${book.id}): count ${currentCount} -> ${newCount}, status -> ${newStatus} (${borrowCount} active borrows)`);
            updated++;
          }
        } else {
          console.log(`✓ Book "${book.title}" (${book.id}) is already in sync: count=${currentCount}, status=${(book as any).status || 'N/A'}`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing book ${book.id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Updated: ${updated} books`);
    console.log(`   Already in sync: ${(books?.length || 0) - updated - errors} books`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} books`);
    }
    
    // Also verify transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, bookId, memberId, type, status, book:books(title)')
      .eq('type', 'borrow')
      .in('status', ['active', 'pending_return_approval']);
    
    if (transError) {
      console.warn(`\n⚠️ Error fetching active transactions:`, transError.message);
    } else {
      console.log(`\n📊 Active transactions: ${transactions?.length || 0}`);
      if (transactions && transactions.length > 0) {
        console.log(`   Transactions:`);
        transactions.forEach(t => {
          console.log(`   - ${(t as any).book?.title || 'Unknown'} (${t.bookId}) - Status: ${t.status}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

syncBookCounts();

