import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../../../data/library.db');

async function cleanupTransactions() {
  console.log('🧹 Cleaning up Transaction Data...\n');
  
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('❌ SQLite database not found at:', SQLITE_PATH);
    return;
  }

  const db = new Database(SQLITE_PATH);
  
  try {
    // First, diagnose
    console.log('📊 Current State:');
    const allTransactions = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
    `).get() as any;
    console.log(`   Total transactions: ${allTransactions.count}`);

    const activeBorrows = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE type = 'borrow' AND status IN ('active', 'pending_return_approval')
    `).get() as any;
    console.log(`   Active borrows: ${activeBorrows.count}`);

    // Find transactions with invalid or missing status
    const invalidStatus = db.prepare(`
      SELECT id, memberId, bookId, type, status 
      FROM transactions 
      WHERE type = 'borrow' AND (status IS NULL OR status NOT IN ('active', 'completed', 'pending_return_approval'))
    `).all() as any[];

    if (invalidStatus.length > 0) {
      console.log(`\n⚠️  Found ${invalidStatus.length} transactions with invalid status:`);
      invalidStatus.forEach(t => {
        console.log(`   - ID: ${t.id}, Status: ${t.status || 'NULL'}`);
      });

      // Fix invalid statuses - set to 'completed' if they're old, or 'active' if recent
      const now = new Date();
      let fixed = 0;
      invalidStatus.forEach(t => {
        const transaction = db.prepare(`
          SELECT createdAt FROM transactions WHERE id = ?
        `).get(t.id) as any;
        
        if (transaction) {
          const created = new Date(transaction.createdAt);
          const daysSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          
          // If transaction is older than 7 days, mark as completed
          // Otherwise, mark as active if it's a borrow
          const newStatus = daysSince > 7 ? 'completed' : 'active';
          
          db.prepare(`
            UPDATE transactions SET status = ? WHERE id = ?
          `).run(newStatus, t.id);
          fixed++;
        }
      });
      console.log(`   ✅ Fixed ${fixed} transactions`);
    }

    // Find orphaned transactions (books or members that don't exist)
    const orphaned = db.prepare(`
      SELECT t.id, t.bookId, t.memberId, t.type, t.status
      FROM transactions t
      LEFT JOIN books b ON t.bookId = b.id
      LEFT JOIN users u ON t.memberId = u.id
      WHERE b.id IS NULL OR u.id IS NULL
    `).all() as any[];

    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned transactions:`);
      orphaned.forEach(t => {
        const bookExists = db.prepare(`SELECT id FROM books WHERE id = ?`).get(t.bookId);
        const memberExists = db.prepare(`SELECT id FROM users WHERE id = ?`).get(t.memberId);
        console.log(`   - ID: ${t.id}, Book exists: ${!!bookExists}, Member exists: ${!!memberExists}`);
      });

      // Delete orphaned transactions
      const deleted = db.prepare(`
        DELETE FROM transactions 
        WHERE id IN (
          SELECT t.id FROM transactions t
          LEFT JOIN books b ON t.bookId = b.id
          LEFT JOIN users u ON t.memberId = u.id
          WHERE b.id IS NULL OR u.id IS NULL
        )
      `).run();
      console.log(`   ✅ Deleted ${deleted.changes} orphaned transactions`);
    }

    // Check for duplicate active borrows (same member, same book, multiple active)
    const duplicates = db.prepare(`
      SELECT memberId, bookId, COUNT(*) as count
      FROM transactions
      WHERE type = 'borrow' AND status IN ('active', 'pending_return_approval')
      GROUP BY memberId, bookId
      HAVING count > 1
    `).all() as any[];

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate active borrows:`);
      duplicates.forEach(d => {
        const transactions = db.prepare(`
          SELECT id, createdAt, status FROM transactions
          WHERE memberId = ? AND bookId = ? AND type = 'borrow' AND status IN ('active', 'pending_return_approval')
          ORDER BY createdAt DESC
        `).all(d.memberId, d.bookId) as any[];
        
        console.log(`   - Member: ${d.memberId}, Book: ${d.bookId}, Count: ${d.count}`);
        // Keep the most recent one, mark others as completed
        if (transactions.length > 1) {
          const keepId = transactions[0].id;
          transactions.slice(1).forEach(t => {
            db.prepare(`UPDATE transactions SET status = 'completed' WHERE id = ?`).run(t.id);
            console.log(`     ✅ Marked transaction ${t.id} as completed`);
          });
        }
      });
    }

    // Final state
    console.log('\n📊 Final State:');
    const finalCount = db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as any;
    console.log(`   Total transactions: ${finalCount.count}`);

    const finalActive = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE type = 'borrow' AND status IN ('active', 'pending_return_approval')
    `).get() as any;
    console.log(`   Active borrows: ${finalActive.count}`);

    console.log('\n✅ Cleanup complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    db.close();
  }
}

cleanupTransactions().catch(console.error);

