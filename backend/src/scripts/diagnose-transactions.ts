import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../../../data/library.db');

async function diagnoseTransactions() {
  console.log('🔍 Diagnosing Transaction Data Issues...\n');
  
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('❌ SQLite database not found at:', SQLITE_PATH);
    return;
  }

  const db = new Database(SQLITE_PATH);
  
  try {
    // Get all transactions
    const allTransactions = db.prepare(`
      SELECT t.*, 
             b.title as book_title, 
             u.name as member_name, 
             u.email as member_email
      FROM transactions t
      LEFT JOIN books b ON t.bookId = b.id
      LEFT JOIN users u ON t.memberId = u.id
      ORDER BY t.createdAt DESC
    `).all() as any[];

    console.log(`📊 Total Transactions: ${allTransactions.length}\n`);

    // Group by member
    const byMember: { [key: string]: any[] } = {};
    allTransactions.forEach(t => {
      if (!byMember[t.memberId]) {
        byMember[t.memberId] = [];
      }
      byMember[t.memberId].push(t);
    });

    console.log('📋 Transactions by Member:');
    Object.keys(byMember).forEach(memberId => {
      const transactions = byMember[memberId];
      const member = transactions[0];
      console.log(`\n  👤 ${member.member_name || member.member_email || memberId}`);
      console.log(`     Total: ${transactions.length}`);
      
      const active = transactions.filter(t => t.type === 'borrow' && ['active', 'pending_return_approval'].includes(t.status));
      console.log(`     Active Borrows: ${active.length}`);
      
      if (active.length > 0) {
        console.log(`     Active Transactions:`);
        active.forEach(t => {
          console.log(`       - ${t.book_title || 'Unknown Book'} (${t.status}) - ID: ${t.id}`);
        });
      }

      // Check for orphaned transactions
      const orphaned = transactions.filter(t => !t.book_title);
      if (orphaned.length > 0) {
        console.log(`     ⚠️  Orphaned (no book): ${orphaned.length}`);
        orphaned.forEach(t => {
          console.log(`       - Book ID: ${t.bookId} - Type: ${t.type} - Status: ${t.status}`);
        });
      }
    });

    // Check for transactions with invalid status
    const invalidStatus = allTransactions.filter(t => 
      t.type === 'borrow' && 
      !['active', 'completed', 'pending_return_approval'].includes(t.status)
    );
    if (invalidStatus.length > 0) {
      console.log(`\n⚠️  Transactions with Invalid Status: ${invalidStatus.length}`);
      invalidStatus.forEach(t => {
        console.log(`   - ID: ${t.id}, Member: ${t.member_name || t.memberId}, Status: ${t.status}`);
      });
    }

    // Check active borrows count vs actual transactions
    console.log('\n🔢 Active Borrows Count Verification:');
    Object.keys(byMember).forEach(memberId => {
      const transactions = byMember[memberId];
      const activeCount = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE memberId = ? AND type = 'borrow' AND status IN ('active', 'pending_return_approval')
      `).get(memberId) as any;
      
      const actualActive = transactions.filter(t => 
        t.type === 'borrow' && ['active', 'pending_return_approval'].includes(t.status)
      );
      
      console.log(`  ${transactions[0].member_name || memberId}:`);
      console.log(`    Query Count: ${activeCount.count}`);
      console.log(`    Actual Count: ${actualActive.length}`);
      
      if (activeCount.count !== actualActive.length) {
        console.log(`    ⚠️  MISMATCH DETECTED!`);
      }
    });

    // Check books availability
    console.log('\n📚 Book Availability Check:');
    const books = db.prepare(`
      SELECT b.*, 
             (SELECT COUNT(*) FROM transactions t 
              WHERE t.bookId = b.id 
              AND t.type = 'borrow' 
              AND t.status IN ('active', 'pending_return_approval')) as active_loans
      FROM books b
    `).all() as any[];

    books.forEach(book => {
      if (book.active_loans > 0) {
        console.log(`  📖 ${book.title}: ${book.active_loans} active loan(s)`);
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

diagnoseTransactions().catch(console.error);

