import { createClient } from '@supabase/supabase-js';
import { MemberRole } from './members/member.interface';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

// Create a Supabase client with the service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // 1. Check if data already exists to prevent duplication
    const { data: existingMembers, error: memberCheckError } = await supabase
      .from('members')
      .select('id')
      .limit(1);

    if (memberCheckError) throw memberCheckError;

    if (existingMembers && existingMembers.length > 0) {
      console.log('⚠️ Seed data seems to already exist. Skipping seed process.');
      return;
    }

    // 2. Create Auth Users (Admin and Member)
    console.log('👤 Creating authentication users...');
    const adminEmail = 'admin@library.com';
    const memberEmail = 'member@library.com';
    const password = 'password';

    const { data: adminAuthUser, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true, // Auto-confirm the email
    });
    if (adminAuthError) throw new Error(`Error creating admin auth user: ${adminAuthError.message}`);
    console.log(`✅ Created admin auth user: ${adminEmail}`);

    const { data: memberAuthUser, error: memberAuthError } = await supabase.auth.admin.createUser({
      email: memberEmail,
      password: password,
      email_confirm: true, // Auto-confirm the email
    });
    if (memberAuthError) throw new Error(`Error creating member auth user: ${memberAuthError.message}`);
    console.log(`✅ Created regular member auth user: ${memberEmail}`);

    const adminId = adminAuthUser.user.id;
    const memberId = memberAuthUser.user.id;

    // 3. Insert Members into the public `members` table
    console.log('Insert members profile data...');
    const { data: seededMembers, error: memberInsertError } = await supabase
      .from('members')
      .insert([
        { id: adminId, name: 'Admin Member', email: adminEmail, role: MemberRole.ADMIN },
        { id: memberId, name: 'Regular Member', email: memberEmail, role: MemberRole.MEMBER },
      ])
      .select();
    if (memberInsertError) throw memberInsertError;
    console.log(`✅ Inserted ${seededMembers.length} members into the members table.`);

    const savedAdmin = seededMembers.find(m => m.email === adminEmail);

    // 4. Create Sample Books
    console.log('📚 Creating sample books...');
    const booksToInsert = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
        { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
        { title: '1984', author: 'George Orwell', isbn: '9780451524935', genre: 'Dystopian', tags: ['fiction', 'dystopian'], status: 'lent', owner_id: savedAdmin.id },
        { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', genre: 'Romance', tags: ['fiction', 'romance'], status: 'available', owner_id: savedAdmin.id },
        { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174', genre: 'Coming-of-age', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    ];

    const { data: createdBooks, error: bookInsertError } = await supabase
      .from('books')
      .insert(booksToInsert)
      .select();
    if (bookInsertError) throw bookInsertError;
    console.log(`✅ Created ${createdBooks.length} books.`);

    // 5. Create Groups
    console.log('👥 Creating groups...');
    const { data: createdGroups, error: groupInsertError } = await supabase
      .from('groups')
      .insert([
          { name: 'Administrators', description: 'Full system access.' },
          { name: 'Librarians', description: 'Staff with book management permissions.' },
          { name: 'Members', description: 'Regular library members.' },
      ])
      .select();
    if (groupInsertError) throw groupInsertError;
    console.log(`✅ Created ${createdGroups.length} groups.`);

    console.log('');
    console.log('✨ Database seeded successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📋 SEED DATA SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('👤 Members Created:');
    console.log(`   • ${adminEmail} (Admin)`);
    console.log(`   • ${memberEmail} (Member)`);
    console.log('   • Password for both: password');
    console.log('');
    console.log('👥 Groups Created:');
    createdGroups.forEach(g => console.log(`   • ${g.name}`));
    console.log('');
    console.log(`📚 Books Created: ${createdBooks.length}`);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run the seed
seed();
