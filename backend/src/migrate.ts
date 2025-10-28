import { createClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { Member } from './models/member.entity';
import { Book } from './models/book.entity';
import { Group } from './models/group.entity';
import { Loan } from './models/loan.entity';
import { Reservation } from './models/reservation.entity';
import { Subscription } from './models/subscription.entity';
import { BookRequest } from './models/book-request.entity';
import { AuthenticationProvider } from './models/authentication-provider.entity';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

// Create a Supabase client with the service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrate() {
  // Create DataSource for the old SQLite database
  const dataSource = new DataSource({
    type: 'sqlite',
    database: './data/library.sqlite',
    entities: [Member, Book, Group, Loan, Reservation, Subscription, BookRequest, AuthenticationProvider],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Connected to the old SQLite database');

    console.log('🚀 Starting data migration...');

    // Migrate members
    const memberRepository = dataSource.getRepository(Member);
    const members = await memberRepository.find();
    const { error: memberError } = await supabase.from('members').insert(members);
    if (memberError) throw memberError;
    console.log(`✅ Migrated ${members.length} members`);

    // Migrate books
    const bookRepository = dataSource.getRepository(Book);
    const books = await bookRepository.find();
    const { error: bookError } = await supabase.from('books').insert(books);
    if (bookError) throw bookError;
    console.log(`✅ Migrated ${books.length} books`);

    // Migrate groups
    const groupRepository = dataSource.getRepository(Group);
    const groups = await groupRepository.find();
    const { error: groupError } = await supabase.from('groups').insert(groups);
    if (groupError) throw groupError;
    console.log(`✅ Migrated ${groups.length} groups`);

    // Migrate loans
    const loanRepository = dataSource.getRepository(Loan);
    const loans = await loanRepository.find();
    const { error: loanError } = await supabase.from('loans').insert(loans);
    if (loanError) throw loanError;
    console.log(`✅ Migrated ${loans.length} loans`);

    // Migrate reservations
    const reservationRepository = dataSource.getRepository(Reservation);
    const reservations = await reservationRepository.find();
    const { error: reservationError } = await supabase.from('reservations').insert(reservations);
    if (reservationError) throw reservationError;
    console.log(`✅ Migrated ${reservations.length} reservations`);

    // Migrate subscriptions
    const subscriptionRepository = dataSource.getRepository(Subscription);
    const subscriptions = await subscriptionRepository.find();
    const { error: subscriptionError } = await supabase.from('subscriptions').insert(subscriptions);
    if (subscriptionError) throw subscriptionError;
    console.log(`✅ Migrated ${subscriptions.length} subscriptions`);

    // Migrate book requests
    const bookRequestRepository = dataSource.getRepository(BookRequest);
    const bookRequests = await bookRequestRepository.find();
    const { error: bookRequestError } = await supabase.from('book_requests').insert(bookRequests);
    if (bookRequestError) throw bookRequestError;
    console.log(`✅ Migrated ${bookRequests.length} book requests`);

    console.log('✨ Data migration completed successfully!');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error migrating data:', error);
    process.exit(1);
  }
}

// Run the migration
migrate();
