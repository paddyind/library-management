import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Member, MemberRole } from './models/member.entity';
import { Book } from './models/book.entity';
import { Group } from './models/group.entity';
import { Notification, NotificationType } from './models/notification.entity';
import { Loan } from './models/loan.entity';
import { Reservation } from './models/reservation.entity';
import { Subscription } from './models/subscription.entity';

async function seed() {
  // Create DataSource
  const dataSource = new DataSource({
    type: 'sqlite',
    database: './data/library.sqlite', // Match the main app's database
    entities: [Member, Book, Group, Notification, Loan, Reservation, Subscription],
    synchronize: true, // Create tables if they don't exist
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connection established');

    const memberRepository = dataSource.getRepository(Member);
    const bookRepository = dataSource.getRepository(Book);
    const groupRepository = dataSource.getRepository(Group);
    const notificationRepository = dataSource.getRepository(Notification);

    // Check if data already exists
    const existingMembers = await memberRepository.count();
    if (existingMembers > 1) {
      console.log('⚠️  Seed data already exists. Skipping...');
      await dataSource.destroy();
      return;
    }

    console.log('🌱 Starting database seed...');

    // Create Members
    console.log('👤 Creating members...');
    const hashedPassword = await bcrypt.hash('password', 10);

    const adminMember = memberRepository.create({
      email: 'admin@library.com',
      password: hashedPassword,
      name: 'Admin Member',
      firstName: 'Admin',
      lastName: 'Member',
      role: MemberRole.ADMIN,
    });

    const regularMember = memberRepository.create({
      email: 'member@library.com',
      password: hashedPassword,
      name: 'Regular Member',
      firstName: 'Regular',
      lastName: 'Member',
      role: MemberRole.MEMBER,
    });

    const [savedAdmin, savedRegularMember] = await memberRepository.save([adminMember, regularMember]);
    console.log(`✅ Created admin member: ${savedAdmin.email}`);
    console.log(`✅ Created regular member: ${savedRegularMember.email}`);

    // Create Groups
    console.log('👥 Creating groups...');
    const adminGroup = groupRepository.create({
      name: 'Administrators',
      description: 'Full system access with all permissions',
      permissions: ['manage_members', 'manage_books', 'manage_groups', 'view_reports', 'manage_system'],
    });

    const librarianGroup = groupRepository.create({
      name: 'Librarians',
      description: 'Library staff with book management permissions',
      permissions: ['manage_books', 'view_reports', 'manage_loans'],
    });

    const membersGroup = groupRepository.create({
      name: 'Members',
      description: 'Regular library members',
      permissions: ['borrow_books', 'view_catalog', 'manage_profile'],
    });

    const [savedAdminGroup, savedLibrarianGroup, savedMembersGroup] = await groupRepository.save([
      adminGroup,
      librarianGroup,
      membersGroup,
    ]);
    console.log(`✅ Created ${savedAdminGroup.name} group`);
    console.log(`✅ Created ${savedLibrarianGroup.name} group`);
    console.log(`✅ Created ${savedMembersGroup.name} group`);

    // Create Sample Books
    console.log('📚 Creating sample books...');
    const books = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        genre: 'Classic',
        tags: ['fiction', 'classic', 'american literature'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        genre: 'Classic',
        tags: ['fiction', 'classic', 'legal drama'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780061120084-M.jpg',
        owner: savedAdmin,
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '9780451524935',
        genre: 'Dystopian',
        tags: ['fiction', 'dystopian', 'political'],
        status: 'lent' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '9780141439518',
        genre: 'Romance',
        tags: ['fiction', 'romance', 'classic'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780141439518-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        isbn: '9780316769174',
        genre: 'Coming-of-age',
        tags: ['fiction', 'coming-of-age', 'classic'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780316769174-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        isbn: '9780547928227',
        genre: 'Fantasy',
        tags: ['fiction', 'fantasy', 'adventure'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'Harry Potter and the Sorcerer\'s Stone',
        author: 'J.K. Rowling',
        isbn: '9780590353427',
        genre: 'Fantasy',
        tags: ['fiction', 'fantasy', 'young adult'],
        status: 'lent' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780590353427-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'The Da Vinci Code',
        author: 'Dan Brown',
        isbn: '9780307474278',
        genre: 'Thriller',
        tags: ['fiction', 'thriller', 'mystery'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780307474278-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        isbn: '9780544003415',
        genre: 'Fantasy',
        tags: ['fiction', 'fantasy', 'epic'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780544003415-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'Brave New World',
        author: 'Aldous Huxley',
        isbn: '9780060850524',
        genre: 'Dystopian',
        tags: ['fiction', 'dystopian', 'science fiction'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780060850524-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        isbn: '9780062315007',
        genre: 'Fiction',
        tags: ['fiction', 'philosophical', 'adventure'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg',
        owner: savedAdmin,
      },
      {
        title: 'Animal Farm',
        author: 'George Orwell',
        isbn: '9780451526342',
        genre: 'Political Satire',
        tags: ['fiction', 'political', 'satire'],
        status: 'available' as const,
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780451526342-M.jpg',
        owner: savedAdmin,
      },
    ];

    const createdBooks = await bookRepository.save(books);
    console.log(`✅ Created ${createdBooks.length} books`);

    // Create Sample Notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = [
      {
        memberId: savedRegularMember.id,
        message: 'Welcome to the Library Management System!',
        type: NotificationType.INFO,
        isRead: false,
      },
      {
        memberId: savedRegularMember.id,
        message: 'Book "1984" is due in 3 days. Please return it on time.',
        type: NotificationType.DUE_SOON,
        isRead: false,
      },
      {
        memberId: savedRegularMember.id,
        message: 'Your membership has been activated successfully.',
        type: NotificationType.SUCCESS,
        isRead: true,
      },
      {
        memberId: savedAdmin.id,
        message: 'New member registration: regular.member@library.com',
        type: NotificationType.INFO,
        isRead: false,
      },
    ];

    const createdNotifications = await notificationRepository.save(
      notifications.map(notification => notificationRepository.create(notification))
    );
    console.log(`✅ Created ${createdNotifications.length} notifications`);

    console.log('');
    console.log('✨ Database seeded successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📋 SEED DATA SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('👤 Members Created:');
    console.log('   • admin@library.com (Admin)');
    console.log('   • member@library.com (Member)');
    console.log('   • Password for both: password');
    console.log('');
    console.log('👥 Groups Created:');
    console.log('   • Administrators');
    console.log('   • Librarians');
    console.log('   • Members');
    console.log('');
    console.log(`📚 Books Created: ${createdBooks.length}`);
    console.log(`🔔 Notifications Created: ${createdNotifications.length}`);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('You can now login with:');
    console.log('  Email: admin@library.com');
    console.log('  Password: password');
    console.log('');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed
seed()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
