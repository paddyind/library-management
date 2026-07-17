/**
 * Seed demo books into Firestore (library__books).
 *
 * Usage (inside backend container or with env vars set):
 *   npm run db:seed:firestore
 *
 * Requires:
 *   FIREBASE_PROJECT_ID, APP_FIRESTORE_PREFIX, GOOGLE_APPLICATION_CREDENTIALS
 */

import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';

const projectId = process.env.FIREBASE_PROJECT_ID;
const prefix = process.env.APP_FIRESTORE_PREFIX || 'library';
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId) {
  console.error('❌ FIREBASE_PROJECT_ID is required');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const db = admin.firestore();
const booksCollection = `${prefix}__books`;

const DEMO_BOOKS = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084' },
  { title: '1984', author: 'George Orwell', isbn: '9780451524935' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518' },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769174' },
];

const SEED_OWNER_ID = process.env.FIRESTORE_SEED_OWNER_ID || '00000000-0000-4000-8000-000000000001';

async function seedBooks(): Promise<void> {
  console.log(`📚 Seeding Firestore collection ${booksCollection} (project=${projectId})`);

  const existing = await db.collection(booksCollection).get();
  const existingIsbns = new Set(
    existing.docs.map((doc) => (doc.data().isbn as string | undefined) ?? '').filter(Boolean),
  );

  let created = 0;
  const now = admin.firestore.Timestamp.now();

  for (const book of DEMO_BOOKS) {
    if (existingIsbns.has(book.isbn)) {
      console.log(`  ⏭️  Skipping existing ISBN ${book.isbn}`);
      continue;
    }

    const id = randomUUID();
    await db.collection(booksCollection).doc(id).set({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      owner_id: SEED_OWNER_ID,
      count: 1,
      status: 'Available',
      forSale: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });

    created++;
    console.log(`  ✅ Created ${book.title}`);
  }

  console.log(`\n✅ Firestore seed complete: ${created} new book(s), ${existing.size} already present`);
}

seedBooks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Firestore seed failed:', error.message);
    if (credentialsPath) {
      console.error(`   Credentials path: ${credentialsPath}`);
    }
    process.exit(1);
  });
