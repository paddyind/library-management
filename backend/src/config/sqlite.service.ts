import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  owner_id: string;
  status?: string; // Optional status field
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SqliteService implements OnModuleInit, OnModuleDestroy {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(private configService: ConfigService) {
    const sqlitePath = this.configService.get<string>('SQLITE_PATH') || 'data/library.sqlite';
    this.dbPath = sqlitePath;
  }

  async onModuleInit() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Try to open database connection
      try {
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL'); // Enable WAL mode for better performance
      } catch (dbError: any) {
        // If native module fails, try to rebuild it
        if (dbError.message && dbError.message.includes('Exec format error')) {
          console.warn('⚠️ SQLite native module architecture mismatch detected. Attempting to rebuild...');
          try {
            const { execSync } = require('child_process');
            execSync('npm rebuild better-sqlite3 --build-from-source', { 
              stdio: 'inherit',
              cwd: process.cwd() 
            });
            // Retry opening database after rebuild
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            console.log('✅ SQLite native module rebuilt successfully');
          } catch (rebuildError: any) {
            console.error('❌ Failed to rebuild better-sqlite3:', rebuildError.message);
            console.error('💡 Solution: Rebuild Docker image with: docker compose build --no-cache backend');
            // Don't throw - allow app to continue, but SQLite won't be available
            this.db = null;
            return; // Exit early, database won't be available
          }
        } else {
          throw dbError;
        }
      }

      // Create users table if it doesn't exist
      this.initializeDatabase();
      console.log('✅ SQLite database initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize SQLite database:', error.message);
      // Don't throw - allow the app to continue, but SQLite won't be available
      this.db = null;
    }
  }

  private initializeDatabase() {
    if (!this.db) return;

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create index on email for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create books table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        owner_id TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create indexes on books table for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn)
    `);

    // Create groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create group_members table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        member_id TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, member_id)
      )
    `);

    // Create indexes for groups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_group_members_member_id ON group_members(member_id)
    `);
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('SQLite database is not initialized');
    }
    return this.db;
  }

  isReady(): boolean {
    return this.db !== null;
  }

  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Hash password synchronously
    const hashedPassword = bcrypt.hashSync(userData.password, 10);

    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(id, userData.email, hashedPassword, userData.name, userData.role, now, now);

      const user = this.findUserByEmail(userData.email);
      if (!user) {
        throw new Error('Failed to create user');
      }

      // Remove password from returned user
      const { password, ...userWithoutPassword } = user;
      return user as User;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  findUserByEmail(email: string): User | null {
    if (!this.db) {
      return null;
    }

    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  findUserById(id: string): User | null {
    if (!this.db) {
      return null;
    }

    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  // Book methods
  createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO books (id, title, author, isbn, ownerId, createdAt, updatedAt, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(id, bookData.title, bookData.author, bookData.isbn || '', bookData.owner_id, now, now, (bookData as any).status || 'available');

      const book = this.findBookById(id);
      if (!book) {
        throw new Error('Failed to create book');
      }

      return book;
    } catch (error: any) {
      throw new Error(`Failed to create book: ${error.message}`);
    }
  }

  findAllBooks(query?: string): Book[] {
    if (!this.db) {
      return [];
    }

    let sql = 'SELECT * FROM books';
    let params: any[] = [];

    if (query) {
      const searchQuery = `%${query}%`;
      sql += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
      params = [searchQuery, searchQuery, searchQuery];
    }

    sql += ' ORDER BY createdAt DESC';

    const stmt = this.db.prepare(sql);
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all();

    return (rows as any[]).map(row => ({
      id: row.id,
      title: row.title,
      author: row.author,
      isbn: row.isbn || '',
      owner_id: row.ownerId || row.owner_id, // Support both column names
      status: row.status || 'available', // Map status field
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  findBookById(id: string): Book | null {
    if (!this.db) {
      return null;
    }

    const stmt = this.db.prepare('SELECT * FROM books WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      author: row.author,
      isbn: row.isbn || '',
      owner_id: row.ownerId || row.owner_id, // Support both column names
      status: row.status || 'available', // Map status field
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  updateBook(id: string, updateData: Partial<Omit<Book, 'id' | 'createdAt'>>): Book {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.title !== undefined) {
      fields.push('title = ?');
      values.push(updateData.title);
    }
    if (updateData.author !== undefined) {
      fields.push('author = ?');
      values.push(updateData.author);
    }
    if (updateData.isbn !== undefined) {
      fields.push('isbn = ?');
      values.push(updateData.isbn);
    }
    if (updateData.owner_id !== undefined) {
      fields.push('owner_id = ?');
      values.push(updateData.owner_id);
    }
    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE books 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const book = this.findBookById(id);
    if (!book) {
      throw new Error('Book not found');
    }

    return book;
  }

  deleteBook(id: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM books WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Book not found');
    }
  }

  async onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

