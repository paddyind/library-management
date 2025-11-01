import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
import { MemberRole } from './members/member.interface';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sqlitePath = process.env.SQLITE_PATH || 'data/library.sqlite';
const authStorage = process.env.AUTH_STORAGE || 'auto';

// Determine which database to use
function getStoragePreference(): 'supabase' | 'sqlite' {
  const storagePreference = authStorage.toLowerCase();
  
  if (storagePreference === 'sqlite') {
    return 'sqlite';
  }
  
  if (storagePreference === 'supabase') {
    if (supabaseUrl && supabaseServiceRoleKey) {
      return 'supabase';
    }
    console.warn('⚠️ Supabase mode requested but credentials missing. Falling back to SQLite.');
    return 'sqlite';
  }
  
  // Auto mode: use Supabase if configured, otherwise SQLite
  if (supabaseUrl && supabaseServiceRoleKey) {
    return 'supabase';
  }
  
  return 'sqlite';
}

/**
 * Check and create tables in Supabase if they don't exist
 * Note: This assumes tables are created via SQL Editor or migration scripts
 */
async function ensureSupabaseTables(supabase: any) {
  const tables = ['users', 'books', 'groups', 'group_members', 'transactions', 'reservations', 'notifications'];
  const missingTables: string[] = [];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          missingTables.push(table);
        }
      }
    } catch (err: any) {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    console.warn('\n⚠️  Missing tables in Supabase:', missingTables.join(', '));
    console.warn('💡 To create tables:');
    console.warn('   1. Run: node scripts/apply-supabase-migrations.js');
    console.warn('   2. Copy the generated SQL to Supabase SQL Editor');
    console.warn('   3. Or run migrations manually from: migrations/supabase/\n');
    return false;
  }

  return true;
}

// Seed Supabase database
async function seedSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📦 Using Supabase database...\n');

  // Check if tables exist
  const tablesExist = await ensureSupabaseTables(supabase);
  if (!tablesExist) {
    throw new Error('Tables do not exist. Please run migrations first.');
  }

  // 1. Check if data already exists to prevent duplication
  const { data: existingMembers, error: memberCheckError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (memberCheckError && memberCheckError.code !== 'PGRST116') {
    console.warn('⚠️ Error checking existing members:', memberCheckError.message);
  }

  if (existingMembers && existingMembers.length > 0) {
    console.log('⚠️ Seed data seems to already exist in Supabase. Skipping seed process.');
    console.log('   To re-seed, delete existing data or use --force flag');
    return;
  }

  // 2. Create Auth Users (Admin, Librarian, and Member)
  console.log('👤 Creating authentication users...');
  const adminEmail = 'admin@library.com';
  const librarianEmail = 'librarian@library.com';
  const memberEmail = 'member@library.com';
  const password = 'password';

  // Check if auth users already exist
  let adminAuthUser, librarianAuthUser, memberAuthUser;
  let adminId, librarianId, memberId;

  try {
    // Try to get existing users
    const { data: adminUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = adminUsers?.users?.find((u: any) => u.email === adminEmail);
    const existingLibrarian = adminUsers?.users?.find((u: any) => u.email === librarianEmail);
    const existingMember = adminUsers?.users?.find((u: any) => u.email === memberEmail);

    if (existingAdmin) {
      console.log(`✅ Admin auth user already exists: ${adminEmail}`);
      adminId = existingAdmin.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: password,
        email_confirm: true,
      });
      if (error) throw new Error(`Error creating admin auth user: ${error.message}`);
      adminAuthUser = data;
      adminId = data.user.id;
      console.log(`✅ Created admin auth user: ${adminEmail}`);
    }

    if (existingLibrarian) {
      console.log(`✅ Librarian auth user already exists: ${librarianEmail}`);
      librarianId = existingLibrarian.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: librarianEmail,
        password: password,
        email_confirm: true,
      });
      if (error) throw new Error(`Error creating librarian auth user: ${error.message}`);
      librarianAuthUser = data;
      librarianId = data.user.id;
      console.log(`✅ Created librarian auth user: ${librarianEmail}`);
    }

    if (existingMember) {
      console.log(`✅ Member auth user already exists: ${memberEmail}`);
      memberId = existingMember.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: memberEmail,
        password: password,
        email_confirm: true,
      });
      if (error) throw new Error(`Error creating member auth user: ${error.message}`);
      memberAuthUser = data;
      memberId = data.user.id;
      console.log(`✅ Created regular member auth user: ${memberEmail}`);
    }
  } catch (error: any) {
    throw new Error(`Error creating auth users: ${error.message}`);
  }

  // 3. Insert Users into the public `users` table
  console.log('\n📝 Inserting user profile data...');
  
  const usersToInsert = [
    { id: adminId, email: adminEmail, name: 'Admin Member', role: MemberRole.ADMIN },
    { id: librarianId, email: librarianEmail, name: 'Librarian Member', role: MemberRole.LIBRARIAN },
    { id: memberId, email: memberEmail, name: 'Regular Member', role: MemberRole.MEMBER },
  ];

  const { data: seededUsers, error: userInsertError } = await supabase
    .from('users')
    .insert(usersToInsert)
    .select();

  if (userInsertError) {
    console.warn('⚠️ Could not insert into users table:', userInsertError.message);
    console.warn('   Attempting individual inserts...');
    
    // Try individual inserts
    for (const user of usersToInsert) {
      const { error } = await supabase.from('users').insert(user);
      if (error) {
        console.warn(`   Failed to insert ${user.email}: ${error.message}`);
      } else {
        console.log(`   ✅ Inserted ${user.email}`);
      }
    }
  } else {
    console.log(`✅ Inserted ${seededUsers?.length || 0} users into the users table.`);
  }

  const savedAdmin = seededUsers?.find((u: any) => u.email === adminEmail) || { id: adminId };

  // 4. Create Sample Books
  console.log('\n📚 Creating sample books...');
  const booksToInsert = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: '1984', author: 'George Orwell', isbn: '9780451524935', genre: 'Dystopian', tags: ['fiction', 'dystopian'], status: 'available', owner_id: savedAdmin.id },
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', genre: 'Romance', tags: ['fiction', 'romance'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174', genre: 'Coming-of-age', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', genre: 'Fantasy', tags: ['fiction', 'fantasy'], status: 'available', owner_id: savedAdmin.id },
    { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', isbn: '9780590353427', genre: 'Fantasy', tags: ['fiction', 'fantasy'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Da Vinci Code', author: 'Dan Brown', isbn: '9780307474278', genre: 'Thriller', tags: ['fiction', 'thriller'], status: 'available', owner_id: savedAdmin.id },
  ];

  const { data: createdBooks, error: bookInsertError } = await supabase
    .from('books')
    .insert(booksToInsert)
    .select();

  if (bookInsertError) {
    console.warn('⚠️ Could not insert into books table (may not exist yet):', bookInsertError.message);
    console.log('   You may need to create the books table manually in Supabase.');
  } else {
    console.log(`✅ Created ${createdBooks?.length || 0} books.`);
  }

  // 5. Create Groups (optional - may not exist)
  console.log('\n👥 Creating groups...');
  const { data: createdGroups, error: groupInsertError } = await supabase
    .from('groups')
    .insert([
      { name: 'Administrators', description: 'Full system access.', permissions: ['admin'] },
      { name: 'Librarians', description: 'Staff with book management permissions.', permissions: ['librarian'] },
      { name: 'Members', description: 'Regular library members.', permissions: ['member'] },
    ])
    .select();

  if (groupInsertError) {
    console.warn('⚠️ Could not insert into groups table (may not exist yet):', groupInsertError.message);
    console.log('   Groups table is optional - skipping.');
  } else {
    console.log(`✅ Created ${createdGroups?.length || 0} groups.`);
  }

  return { seededUsers, createdBooks, createdGroups };
}

// Seed SQLite database
function seedSqlite() {
  console.log('📦 Using SQLite database...\n');

  // Ensure data directory exists
  const dbDir = path.dirname(sqlitePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open database connection
  const db = new Database(sqlitePath);
  db.pragma('journal_mode = WAL');

  try {
    // Check if tables exist, if not create them (from migration)
    const tablesExist = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).get();

    if (!tablesExist) {
      console.warn('⚠️  Tables do not exist. Running migrations...');
      // Load and execute migration
      const migrationPath = path.join(__dirname, '..', 'migrations', 'sqlite', '001_initial_schema.sql');
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        db.exec(migrationSQL);
        console.log('✅ Tables created from migration');
      } else {
        throw new Error('Migration file not found. Please run migrations first.');
      }
    }

    // Check if data already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@library.com');
    if (existingUser) {
      console.log('⚠️ Seed data seems to already exist in SQLite. Skipping seed process.');
      db.close();
      return;
    }

    // 1. Create Users (Admin, Librarian, and Member)
    console.log('👤 Creating users...');
    const adminEmail = 'admin@library.com';
    const librarianEmail = 'librarian@library.com';
    const memberEmail = 'member@library.com';
    const password = 'password';

    const adminId = `user-${Date.now()}-admin`;
    const librarianId = `user-${Date.now()}-librarian`;
    const memberId = `user-${Date.now()}-member`;
    const now = new Date().toISOString();

    const adminPasswordHash = bcrypt.hashSync(password, 10);
    const librarianPasswordHash = bcrypt.hashSync(password, 10);
    const memberPasswordHash = bcrypt.hashSync(password, 10);

    // Insert admin user (use lowercase 'admin' for enum compatibility)
    db.prepare(`
      INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      adminEmail,
      adminPasswordHash,
      'Admin Member',
      'admin', // Use lowercase to match MemberRole.ADMIN enum value
      now,
      now
    );

    console.log(`✅ Created admin user: ${adminEmail}`);

    // Insert librarian user
    db.prepare(`
      INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      librarianId,
      librarianEmail,
      librarianPasswordHash,
      'Librarian Member',
      MemberRole.LIBRARIAN,
      now,
      now
    );

    console.log(`✅ Created librarian user: ${librarianEmail}`);

    // Insert member user
    db.prepare(`
      INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      memberId,
      memberEmail,
      memberPasswordHash,
      'Regular Member',
      MemberRole.MEMBER,
      now,
      now
    );

    console.log(`✅ Created member user: ${memberEmail}`);

    // 2. Create Sample Books
    console.log('\n📚 Creating sample books...');
    const books = [
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', owner_id: adminId },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', owner_id: adminId },
      { title: '1984', author: 'George Orwell', isbn: '9780451524935', owner_id: adminId },
      { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', owner_id: adminId },
      { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174', owner_id: adminId },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', owner_id: adminId },
      { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', isbn: '9780590353427', owner_id: adminId },
      { title: 'The Da Vinci Code', author: 'Dan Brown', isbn: '9780307474278', owner_id: adminId },
    ];

    const insertBook = db.prepare(`
      INSERT INTO books (id, title, author, isbn, owner_id, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const book of books) {
      const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      insertBook.run(
        bookId,
        book.title,
        book.author,
        book.isbn,
        book.owner_id,
        now,
        now
      );
    }

    console.log(`✅ Created ${books.length} books.`);

    // 3. Create Groups
    console.log('\n👥 Creating groups...');
    const insertGroup = db.prepare(`
      INSERT INTO groups (name, description, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const groups = [
      { name: 'Administrators', description: 'Full system access.', permissions: JSON.stringify(['admin']) },
      { name: 'Librarians', description: 'Staff with book management permissions.', permissions: JSON.stringify(['librarian']) },
      { name: 'Members', description: 'Regular library members.', permissions: JSON.stringify(['member']) },
    ];

    for (const group of groups) {
      insertGroup.run(
        group.name,
        group.description,
        group.permissions,
        now,
        now
      );
    }

    console.log(`✅ Created ${groups.length} groups.`);

    db.close();
    return { booksCreated: books.length, groupsCreated: groups.length };

  } catch (error: any) {
    db.close();
    throw error;
  }
}

// Main seed function
async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    console.log(`📊 Storage preference: ${authStorage}`);
    console.log('');

    const storage = getStoragePreference();

    let result;
    if (storage === 'supabase') {
      result = await seedSupabase();
    } else {
      result = seedSqlite();
    }

    console.log('');
    console.log('✨ Database seeded successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📋 SEED DATA SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('👤 Users Created:');
    console.log('   • admin@library.com (Admin)');
    console.log('   • librarian@library.com (Librarian)');
    console.log('   • member@library.com (Member)');
    console.log('   • Password for all: password');
    console.log('');
    console.log(`📚 Books Created: ${storage === 'supabase' ? (result as any)?.createdBooks?.length || '8' : '8'}`);
    if (storage === 'supabase' && (result as any)?.createdGroups) {
      console.log('');
      console.log('👥 Groups Created:');
      (result as any).createdGroups.forEach((g: any) => console.log(`   • ${g.name}`));
    }
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seed
seed();
