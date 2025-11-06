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

/**
 * Create custom fetch function with SSL certificate handling
 * Similar to supabase.service.ts - handles corporate network SSL issues
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
              if (err.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' && !relaxed) {
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
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    } catch (error: any) {
      throw error;
    }
  };
}

// Seed Supabase database
async function seedSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  // Create custom fetch with SSL handling
  const customFetch = createCustomFetch(supabaseServiceRoleKey);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: customFetch,
    },
  });

  console.log('📦 Using Supabase database...\n');

  // Check if tables exist (gracefully handle connection errors)
  try {
    const tablesExist = await ensureSupabaseTables(supabase);
    if (!tablesExist) {
      console.warn('⚠️  Some tables may not exist. Continuing anyway - will attempt to create data.\n');
      // Don't throw - try to proceed anyway
    }
  } catch (error: any) {
    if (error.message?.includes('fetch failed') || error.message?.includes('UNABLE_TO_GET_ISSUER_CERT')) {
      console.error('\n❌ Cannot connect to Supabase due to SSL/network issues.');
      console.error('💡 Solutions:');
      console.error('   1. Use SQLite instead: Set AUTH_STORAGE=sqlite');
      console.error('   2. Fix SSL certificates or network connectivity');
      console.error('   3. Run Supabase setup manually via Supabase Dashboard\n');
      throw new Error('Supabase connection failed. Please use SQLite or fix network/SSL issues.');
    }
    throw error;
  }

  // 1. Check if data already exists to prevent duplication
  const { data: existingMembers, error: memberCheckError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (memberCheckError && memberCheckError.code !== 'PGRST116') {
    console.warn('⚠️ Error checking existing members:', memberCheckError.message);
  }

  // Check if is_demo column exists
  let hasIsDemoColumn = false;
  try {
    const { error: columnCheckError } = await supabase
      .from('users')
      .select('is_demo')
      .limit(1);
    hasIsDemoColumn = !columnCheckError || !columnCheckError.message?.includes('is_demo');
  } catch (err: any) {
    // Column likely doesn't exist
    hasIsDemoColumn = false;
  }

  if (!hasIsDemoColumn) {
    console.warn('\n⚠️  WARNING: is_demo column not found in Supabase users table.');
    console.warn('   Seeding without is_demo flag (demo users will work but won\'t be marked).');
    console.warn('   To enable is_demo flag:');
    console.warn('   1. Apply migration: migrations/supabase/002_add_is_demo_flag.sql');
    console.warn('   2. Run seed again to update existing users\n');
  }

  // Check if specific demo users exist (not just any users)
  const selectFields = hasIsDemoColumn ? 'email, id, is_demo' : 'email, id';
  const { data: demoUsers, error: demoUsersError } = await supabase
    .from('users')
    .select(selectFields)
    .in('email', ['demo_admin@library.com', 'demo_librarian@library.com', 'demo_member@library.com']);
  
  if (demoUsersError && demoUsersError.message?.includes('is_demo')) {
    // Fallback if is_demo query fails
    const { data: fallbackUsers } = await supabase
      .from('users')
      .select('email, id')
      .in('email', ['demo_admin@library.com', 'demo_librarian@library.com', 'demo_member@library.com']);
    if (fallbackUsers && fallbackUsers.length > 0) {
      console.log(`ℹ️  Found ${fallbackUsers.length} existing demo user(s) in Supabase.`);
      console.log('   Existing demo users:', fallbackUsers.map((u: any) => u.email).join(', '));
    }
  } else if (demoUsers && demoUsers.length > 0) {
    console.log(`ℹ️  Found ${demoUsers.length} existing demo user(s) in Supabase.`);
    console.log('   Existing demo users:', demoUsers.map((u: any) => u.email).join(', '));
    if (hasIsDemoColumn) {
      console.log('   Will update is_demo flag and continue seeding...');
    }
    console.log('');
  }

  // 2. Create Auth Users (Admin, Librarian, and Member)
  console.log('👤 Creating authentication users...');
  const adminEmail = 'demo_admin@library.com';
  const librarianEmail = 'demo_librarian@library.com';
  const memberEmail = 'demo_member@library.com';
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
    // Handle SSL/certificate errors gracefully
    if (error.message?.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY') || 
        error.message?.includes('fetch failed') ||
        error.cause?.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
      console.error('\n❌ SSL Certificate Error: Unable to verify Supabase SSL certificate');
      console.error('💡 This is common in corporate networks. Solutions:');
      console.error('   1. Run Supabase SQL migrations manually via Supabase SQL Editor');
      console.error('   2. Create auth users manually in Supabase Dashboard → Authentication');
      console.error('   3. Use SQLite instead: Set AUTH_STORAGE=sqlite');
      console.error('   4. Configure SSL certificates in your Docker environment\n');
      throw new Error('Supabase SSL certificate validation failed. Please use manual setup or SQLite.');
    }
    throw new Error(`Error creating auth users: ${error.message}`);
  }

  // 3. Insert Users into the public `users` table (check if exists first)
  console.log('\n📝 Inserting user profile data...');
  
  // Check existing users (with or without is_demo based on column existence)
  const userSelectFields = hasIsDemoColumn ? 'email, id, is_demo' : 'email, id';
  const { data: existingUsers, error: existingUsersError } = await supabase
    .from('users')
    .select(userSelectFields)
    .in('email', [adminEmail, librarianEmail, memberEmail]);
  
  // If query failed due to missing is_demo, retry without it
  let finalExistingUsers: any[] | null = existingUsers;
  if (existingUsersError && existingUsersError.message?.includes('is_demo')) {
    const { data: fallbackUsers } = await supabase
      .from('users')
      .select('email, id')
      .in('email', [adminEmail, librarianEmail, memberEmail]);
    finalExistingUsers = fallbackUsers;
    hasIsDemoColumn = false; // Column definitely doesn't exist
  }
  
  const existingUserEmails = new Set((finalExistingUsers || []).map((u: any) => u.email));
  
  // Update existing demo users to ensure is_demo flag is set (only if column exists)
  if (hasIsDemoColumn && finalExistingUsers && finalExistingUsers.length > 0) {
    const usersToUpdate = finalExistingUsers.filter((u: any) => u.is_demo === false || u.is_demo === null || u.is_demo === undefined);
    if (usersToUpdate.length > 0) {
      console.log(`   🔄 Updating ${usersToUpdate.length} existing demo user(s) to set is_demo flag...`);
      for (const user of usersToUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_demo: true })
          .eq('id', user.id);
        if (updateError) {
          console.warn(`   ⚠️  Could not update is_demo for ${user.email}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated ${user.email} to mark as demo user`);
        }
      }
    }
  }
  
  // Build user objects - conditionally include is_demo based on column existence
  const userBaseData = [
    { id: adminId, email: adminEmail, name: 'Admin Member', role: MemberRole.ADMIN },
    { id: librarianId, email: librarianEmail, name: 'Librarian Member', role: MemberRole.LIBRARIAN },
    { id: memberId, email: memberEmail, name: 'Regular Member', role: MemberRole.MEMBER },
  ];
  
  const usersToInsert = userBaseData
    .filter(u => !existingUserEmails.has(u.email))
    .map(u => {
      if (hasIsDemoColumn) {
        return { ...u, is_demo: true };
      }
      return u;
    }) as Array<{ id: any; email: string; name: string; role: MemberRole; is_demo?: boolean }>;

  // Cleanup old demo users (admin@library.com, member@library.com, etc.)
  console.log('\n🧹 Cleaning up old demo users...');
  const oldUserEmails = ['admin@library.com', 'member@library.com', 'librarian@library.com', 'user@library.com'];
  const { data: oldUsers } = await supabase
    .from('users')
    .select('id, email')
    .in('email', oldUserEmails);
  
  if (oldUsers && oldUsers.length > 0) {
    const oldUserIds = oldUsers.map((u: any) => u.id);
    
    // Delete from group_members first (foreign key constraint)
    await supabase.from('group_members').delete().in('member_id', oldUserIds);
    console.log(`   ✅ Removed ${oldUsers.length} old user(s) from group_members`);
    
    // Delete old users
    const { error: deleteError } = await supabase.from('users').delete().in('id', oldUserIds);
    if (deleteError) {
      console.warn(`   ⚠️  Could not delete all old users: ${deleteError.message}`);
    } else {
      console.log(`   ✅ Deleted ${oldUsers.length} old demo user(s): ${oldUsers.map((u: any) => u.email).join(', ')}`);
    }
  } else {
    console.log('   ℹ️  No old demo users found to cleanup.');
  }

  let seededUsers: any[] = existingUsers || [];
  
  if (usersToInsert.length > 0) {
    const { data: newUsers, error: userInsertError } = await supabase
      .from('users')
      .insert(usersToInsert)
      .select();

    if (userInsertError) {
      // If error is due to missing is_demo column, retry without it
      if (userInsertError.message?.includes('is_demo')) {
        console.warn('⚠️  is_demo column not found, inserting without it...');
        const usersWithoutIsDemo = usersToInsert.map((user) => {
          const { is_demo, ...rest } = user;
          return rest;
        });
        
        const { data: retryUsers, error: retryError } = await supabase
          .from('users')
          .insert(usersWithoutIsDemo)
          .select();
        
        if (retryError) {
          console.warn('⚠️ Batch insert failed, trying individual inserts...');
          for (const user of usersWithoutIsDemo) {
            const { data: insertedUser, error } = await supabase
              .from('users')
              .insert(user)
              .select()
              .single();
            
            if (error) {
              if (error.code === '23505') { // Unique constraint violation
                console.log(`   ⏭️  User ${user.email} already exists, skipping.`);
              } else {
                console.warn(`   ⚠️  Failed to insert ${user.email}: ${error.message}`);
              }
            } else {
              seededUsers.push(insertedUser);
              console.log(`   ✅ Inserted ${user.email}`);
            }
          }
        } else {
          seededUsers = [...seededUsers, ...(retryUsers || [])];
          console.log(`✅ Inserted ${retryUsers?.length || 0} new users (without is_demo flag).`);
        }
      } else {
        console.warn('⚠️ Batch insert failed, trying individual inserts...');
        
        // Try individual inserts
        for (const user of usersToInsert) {
          // Remove is_demo if column doesn't exist
          const { is_demo, ...userWithoutIsDemo } = user;
          const userToInsert = hasIsDemoColumn ? user : userWithoutIsDemo;
          const { data: insertedUser, error } = await supabase
            .from('users')
            .insert(userToInsert)
            .select()
            .single();
          
          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              console.log(`   ⏭️  User ${user.email} already exists, skipping.`);
            } else if (error.message?.includes('is_demo')) {
              // Last resort: try without is_demo
              const { data: fallbackUser, error: fallbackError } = await supabase
                .from('users')
                .insert(userWithoutIsDemo)
                .select()
                .single();
              if (fallbackError) {
                console.warn(`   ⚠️  Failed to insert ${user.email}: ${fallbackError.message}`);
              } else {
                seededUsers.push(fallbackUser);
                console.log(`   ✅ Inserted ${user.email} (without is_demo flag)`);
              }
            } else {
              console.warn(`   ⚠️  Failed to insert ${user.email}: ${error.message}`);
            }
          } else {
            seededUsers.push(insertedUser);
            console.log(`   ✅ Inserted ${user.email}`);
          }
        }
      }
    } else {
      seededUsers = [...seededUsers, ...(newUsers || [])];
      console.log(`✅ Inserted ${newUsers?.length || 0} new users into the users table.`);
    }
  } else {
    console.log('✅ All demo users already exist, skipping user creation.');
  }

  const savedAdmin = seededUsers.find((u: any) => u.email === adminEmail) || { id: adminId };

  // 4. Create Sample Books (check if exists by ISBN first)
  console.log('\n📚 Creating sample books...');
  
  const bookISBNs = [
    '9780743273565', '9780061120084', '9780451524935', '9780141439518',
    '9780316769174', '9780547928227', '9780590353427', '9780307474278'
  ];
  
  const { data: existingBooks } = await supabase
    .from('books')
    .select('isbn')
    .in('isbn', bookISBNs);
  
  const existingISBNs = new Set((existingBooks || []).map((b: any) => b.isbn));
  
  const booksToInsert = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', genre: 'Classic', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: '1984', author: 'George Orwell', isbn: '9780451524935', genre: 'Dystopian', tags: ['fiction', 'dystopian'], status: 'available', owner_id: savedAdmin.id },
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', genre: 'Romance', tags: ['fiction', 'romance'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174', genre: 'Coming-of-age', tags: ['fiction', 'classic'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', genre: 'Fantasy', tags: ['fiction', 'fantasy'], status: 'available', owner_id: savedAdmin.id },
    { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', isbn: '9780590353427', genre: 'Fantasy', tags: ['fiction', 'fantasy'], status: 'available', owner_id: savedAdmin.id },
    { title: 'The Da Vinci Code', author: 'Dan Brown', isbn: '9780307474278', genre: 'Thriller', tags: ['fiction', 'thriller'], status: 'available', owner_id: savedAdmin.id },
  ].filter(b => !existingISBNs.has(b.isbn));

  let createdBooks: any[] = existingBooks || [];
  
  if (booksToInsert.length > 0) {
    const { data: newBooks, error: bookInsertError } = await supabase
      .from('books')
      .insert(booksToInsert)
      .select();

    if (bookInsertError) {
      console.warn('⚠️ Batch insert failed, trying individual inserts...');
      for (const book of booksToInsert) {
        const { data: insertedBook, error } = await supabase
          .from('books')
          .insert(book)
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`   ⏭️  Book "${book.title}" already exists, skipping.`);
          } else {
            console.warn(`   ⚠️  Could not insert "${book.title}": ${error.message}`);
          }
        } else {
          createdBooks.push(insertedBook);
          console.log(`   ✅ Created book: ${book.title}`);
        }
      }
    } else {
      createdBooks = [...createdBooks, ...(newBooks || [])];
      console.log(`✅ Created ${newBooks?.length || 0} new books.`);
    }
  } else {
    console.log('✅ All demo books already exist, skipping book creation.');
  }

  // 5. Create Groups (check if exists first, handle gracefully)
  console.log('\n👥 Creating groups...');
  
  // Check existing groups first
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('name');
  
  const existingGroupNames = new Set((existingGroups || []).map((g: any) => g.name));
  
  const groupsToInsert = [
    { name: 'Administrators', description: 'Full system access.', permissions: ['admin'] },
    { name: 'Librarians', description: 'Staff with book management permissions.', permissions: ['librarian'] },
    { name: 'Members', description: 'Regular library members.', permissions: ['member'] },
  ].filter(g => !existingGroupNames.has(g.name));
  
  let createdGroups: any[] = [];
  
  if (groupsToInsert.length > 0) {
    const { data: newGroups, error: groupInsertError } = await supabase
      .from('groups')
      .insert(groupsToInsert)
      .select();
    
    if (groupInsertError) {
      // Try individual inserts for better error handling
      console.warn('⚠️ Batch insert failed, trying individual inserts...');
      for (const group of groupsToInsert) {
        const { data: insertedGroup, error } = await supabase
          .from('groups')
          .insert(group)
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`   ⏭️  Group "${group.name}" already exists, skipping.`);
          } else {
            console.warn(`   ⚠️  Could not insert group "${group.name}": ${error.message}`);
          }
        } else {
          createdGroups.push(insertedGroup);
          console.log(`   ✅ Created group: ${group.name}`);
        }
      }
    } else {
      createdGroups = newGroups || [];
      console.log(`✅ Created ${createdGroups.length} new groups.`);
    }
  } else {
    console.log('✅ All groups already exist, skipping creation.');
    // Fetch existing groups for return value
    const { data: allGroups } = await supabase.from('groups').select('*');
    createdGroups = allGroups || [];
  }

  // 6. Populate group_members table (assign users to their respective groups)
  console.log('\n🔗 Assigning users to groups...');
  
  // Get group IDs by name
  const { data: allGroupsWithIds } = await supabase
    .from('groups')
    .select('id, name');
  
  if (!allGroupsWithIds || allGroupsWithIds.length === 0) {
    console.warn('⚠️  No groups found, cannot assign users to groups.');
  } else {
    const groupMap = new Map(allGroupsWithIds.map((g: any) => [g.name, g.id]));
    const adminGroupId = groupMap.get('Administrators');
    const librarianGroupId = groupMap.get('Librarians');
    const memberGroupId = groupMap.get('Members');
    
    // Get user IDs by email
    const adminUser = seededUsers.find((u: any) => u.email === adminEmail);
    const librarianUser = seededUsers.find((u: any) => u.email === librarianEmail);
    const memberUser = seededUsers.find((u: any) => u.email === memberEmail);
    
    // Check existing group_members to avoid duplicates
    const { data: existingMemberships } = await supabase
      .from('group_members')
      .select('group_id, member_id');
    
    const existingMembershipsSet = new Set(
      (existingMemberships || []).map((m: any) => `${m.group_id}-${m.member_id}`)
    );
    
    const membershipsToInsert: any[] = [];
    
    if (adminUser && adminGroupId) {
      const key = `${adminGroupId}-${adminUser.id}`;
      if (!existingMembershipsSet.has(key)) {
        membershipsToInsert.push({ group_id: adminGroupId, member_id: adminUser.id });
      }
    }
    
    if (librarianUser && librarianGroupId) {
      const key = `${librarianGroupId}-${librarianUser.id}`;
      if (!existingMembershipsSet.has(key)) {
        membershipsToInsert.push({ group_id: librarianGroupId, member_id: librarianUser.id });
      }
    }
    
    if (memberUser && memberGroupId) {
      const key = `${memberGroupId}-${memberUser.id}`;
      if (!existingMembershipsSet.has(key)) {
        membershipsToInsert.push({ group_id: memberGroupId, member_id: memberUser.id });
      }
    }
    
    if (membershipsToInsert.length > 0) {
      const { error: membershipError } = await supabase
        .from('group_members')
        .insert(membershipsToInsert);
      
      if (membershipError) {
        console.warn('⚠️  Error inserting group memberships:', membershipError.message);
        // Try individual inserts
        for (const membership of membershipsToInsert) {
          const { error } = await supabase
            .from('group_members')
            .insert(membership);
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.warn(`   ⚠️  Could not assign user to group: ${error.message}`);
          } else {
            console.log(`   ✅ Assigned user to group`);
          }
        }
      } else {
        console.log(`✅ Assigned ${membershipsToInsert.length} users to their groups.`);
      }
    } else {
      console.log('✅ All user-group assignments already exist.');
    }
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

    // 1. Create Users (Admin, Librarian, and Member) - check if exists first
    console.log('👤 Creating users...');
    
    // Check existing demo users
    const existingDemoUsers = db.prepare(`
      SELECT email FROM users 
      WHERE email IN (?, ?, ?)
    `).all('demo_admin@library.com', 'demo_librarian@library.com', 'demo_member@library.com') as Array<{email: string}>;
    
    const existingEmails = new Set(existingDemoUsers.map(u => u.email));
    
    if (existingEmails.size > 0) {
      console.log(`⚠️ Demo users already exist: ${Array.from(existingEmails).join(', ')}`);
      console.log('   Existing demo users will be preserved.\n');
    }
    const adminEmail = 'demo_admin@library.com';
    const librarianEmail = 'demo_librarian@library.com';
    const memberEmail = 'demo_member@library.com';
    const password = 'password';

    // Check for existing demo users to get their IDs
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any;
    const existingLibrarian = db.prepare('SELECT id FROM users WHERE email = ?').get(librarianEmail) as any;
    const existingMember = db.prepare('SELECT id FROM users WHERE email = ?').get(memberEmail) as any;
    
    let adminId = existingAdmin?.id || `user-${Date.now()}-admin`;
    let librarianId = existingLibrarian?.id || `user-${Date.now()}-librarian`;
    let memberId = existingMember?.id || `user-${Date.now()}-member`;
    
    // Cleanup old demo users (admin@library.com, member@library.com, etc.)
    console.log('\n🧹 Cleaning up old demo users...');
    const oldUserEmails = ['admin@library.com', 'member@library.com', 'librarian@library.com', 'user@library.com'];
    const oldUsers = db.prepare(`
      SELECT id, email FROM users 
      WHERE email IN (?, ?, ?, ?)
    `).all(...oldUserEmails) as Array<{id: string, email: string}>;
    
    if (oldUsers.length > 0) {
      // Delete from group_members first (foreign key constraint)
      const deleteGroupMembers = db.prepare('DELETE FROM group_members WHERE member_id = ?');
      const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
      
      for (const user of oldUsers) {
        deleteGroupMembers.run(user.id);
        deleteUser.run(user.id);
      }
      console.log(`   ✅ Deleted ${oldUsers.length} old demo user(s): ${oldUsers.map(u => u.email).join(', ')}`);
    } else {
      console.log('   ℹ️  No old demo users found to cleanup.');
    }
    const now = new Date().toISOString();

    // Use same password hash for consistency (if users don't exist, create them)
    const passwordHash = bcrypt.hashSync(password, 10); // Same hash for all users
    
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, name, role, createdAt, updatedAt, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let usersCreated = 0;
    
    if (!existingEmails.has(adminEmail)) {
      insertUser.run(adminId, adminEmail, passwordHash, 'Admin Member', 'admin', now, now, 1);
      usersCreated++;
      console.log(`✅ Created admin user: ${adminEmail}`);
    } else {
      // Get existing admin ID
      const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as {id: string};
      adminId = existingAdmin.id;
      console.log(`⏭️  Admin user already exists: ${adminEmail}`);
    }

    if (!existingEmails.has(librarianEmail)) {
      insertUser.run(librarianId, librarianEmail, passwordHash, 'Librarian Member', MemberRole.LIBRARIAN, now, now, 1);
      usersCreated++;
      console.log(`✅ Created librarian user: ${librarianEmail}`);
    } else {
      const existingLibrarian = db.prepare('SELECT id FROM users WHERE email = ?').get(librarianEmail) as {id: string};
      librarianId = existingLibrarian.id;
      console.log(`⏭️  Librarian user already exists: ${librarianEmail}`);
    }

    if (!existingEmails.has(memberEmail)) {
      insertUser.run(memberId, memberEmail, passwordHash, 'Regular Member', MemberRole.MEMBER, now, now, 1);
      usersCreated++;
      console.log(`✅ Created member user: ${memberEmail}`);
    } else {
      const existingMember = db.prepare('SELECT id FROM users WHERE email = ?').get(memberEmail) as {id: string};
      memberId = existingMember.id;
      console.log(`⏭️  Member user already exists: ${memberEmail}`);
    }
    
    if (usersCreated === 0) {
      console.log('✅ All demo users already exist.');
    }

    // 2. Create Sample Books (check if exists by ISBN first)
    console.log('\n📚 Creating sample books...');
    
    // Check existing books by ISBN
    const existingBooks = db.prepare(`
      SELECT isbn FROM books 
      WHERE isbn IN (?, ?, ?, ?, ?, ?, ?, ?)
    `).all(
      '9780743273565', '9780061120084', '9780451524935', '9780141439518',
      '9780316769174', '9780547928227', '9780590353427', '9780307474278'
    ) as Array<{isbn: string}>;
    
    const existingISBNs = new Set(existingBooks.map(b => b.isbn));
    
    const books = [
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', ownerId: adminId },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', ownerId: adminId },
      { title: '1984', author: 'George Orwell', isbn: '9780451524935', ownerId: adminId },
      { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', ownerId: adminId },
      { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174', ownerId: adminId },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', ownerId: adminId },
      { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', isbn: '9780590353427', ownerId: adminId },
      { title: 'The Da Vinci Code', author: 'Dan Brown', isbn: '9780307474278', ownerId: adminId },
    ].filter(b => !existingISBNs.has(b.isbn));

    const insertBook = db.prepare(`
      INSERT OR IGNORE INTO books (id, title, author, isbn, owner_id, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let booksCreated = 0;
    for (const book of books) {
      const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        insertBook.run(bookId, book.title, book.author, book.isbn, book.ownerId, now, now);
        booksCreated++;
        console.log(`   ✅ Created book: ${book.title}`);
      } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`   ⏭️  Book "${book.title}" already exists, skipping.`);
        } else {
          console.warn(`   ⚠️  Could not insert "${book.title}": ${err.message}`);
        }
      }
    }

    console.log(`✅ Created ${booksCreated} new books (${existingBooks.length} already existed).`);

    // 3. Create Groups (check if exists first)
    console.log('\n👥 Creating groups...');
    
    // Check existing groups
    const existingGroups = db.prepare('SELECT name FROM groups').all() as Array<{name: string}>;
    const existingGroupNames = new Set(existingGroups.map(g => g.name));
    
    const insertGroup = db.prepare(`
      INSERT OR IGNORE INTO groups (name, description, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const groups = [
      { name: 'Administrators', description: 'Full system access.', permissions: JSON.stringify(['admin']) },
      { name: 'Librarians', description: 'Staff with book management permissions.', permissions: JSON.stringify(['librarian']) },
      { name: 'Members', description: 'Regular library members.', permissions: JSON.stringify(['member']) },
    ];

    let groupsCreated = 0;
    for (const group of groups) {
      if (!existingGroupNames.has(group.name)) {
        insertGroup.run(
          group.name,
          group.description,
          group.permissions,
          now,
          now
        );
        groupsCreated++;
        console.log(`   ✅ Created group: ${group.name}`);
      } else {
        console.log(`   ⏭️  Group "${group.name}" already exists, skipping.`);
      }
    }

    console.log(`✅ Created ${groupsCreated} new groups (${existingGroups.length} already existed).`);

    // 4. Populate group_members table (assign users to their respective groups)
    console.log('\n🔗 Assigning users to groups...');
    
    // Get group IDs by name
    const allGroups = db.prepare('SELECT id, name FROM groups').all() as Array<{id: number, name: string}>;
    const groupMap = new Map(allGroups.map(g => [g.name, g.id]));
    const adminGroupId = groupMap.get('Administrators');
    const librarianGroupId = groupMap.get('Librarians');
    const memberGroupId = groupMap.get('Members');
    
    // Get user IDs by email
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as {id: string} | undefined;
    const librarianUser = db.prepare('SELECT id FROM users WHERE email = ?').get(librarianEmail) as {id: string} | undefined;
    const memberUser = db.prepare('SELECT id FROM users WHERE email = ?').get(memberEmail) as {id: string} | undefined;
    
    const insertGroupMember = db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, member_id)
      VALUES (?, ?)
    `);
    
    let membershipsCreated = 0;
    
    if (adminUser && adminGroupId) {
      insertGroupMember.run(adminGroupId, adminUser.id);
      membershipsCreated++;
      console.log(`   ✅ Assigned ${adminEmail} to Administrators group`);
    }
    
    if (librarianUser && librarianGroupId) {
      insertGroupMember.run(librarianGroupId, librarianUser.id);
      membershipsCreated++;
      console.log(`   ✅ Assigned ${librarianEmail} to Librarians group`);
    }
    
    if (memberUser && memberGroupId) {
      insertGroupMember.run(memberGroupId, memberUser.id);
      membershipsCreated++;
      console.log(`   ✅ Assigned ${memberEmail} to Members group`);
    }
    
    console.log(`✅ Created ${membershipsCreated} user-group assignments.`);

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
      try {
        result = await seedSupabase();
      } catch (error: any) {
        // If Supabase fails due to SSL/network, suggest SQLite
        if (error.message?.includes('SSL') || 
            error.message?.includes('connection') ||
            error.message?.includes('fetch failed') ||
            error.message?.includes('Supabase connection failed')) {
          console.error('\n❌ Supabase seeding failed due to network/SSL issues.');
          console.error('💡 Automatically falling back to SQLite...\n');
          // Fall back to SQLite if Supabase fails
          result = seedSqlite();
        } else {
          throw error; // Re-throw other errors
        }
      }
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
    console.log('   • demo_admin@library.com (Admin)');
    console.log('   • demo_librarian@library.com (Librarian)');
    console.log('   • demo_member@library.com (Member)');
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
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    // Don't exit - let the calling script handle it
    // This allows db:init to continue even if some seed operations fail
    throw error;
  }
}

// Run the seed
seed().catch((error) => {
  console.error('❌ Fatal error in seed script:', error.message);
  process.exit(1);
});
