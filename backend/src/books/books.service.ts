import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book, BookStatus } from './book.interface';

@Injectable()
export class BooksService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  private usesFirebase(): boolean { return usesFirebase(this.configService, this.firestoreService); }
  private getPreferredStorage(): 'sqlite' { return 'sqlite'; }

  async create(dto: CreateBookDto, ownerId: string): Promise<Book> {
    if (this.usesFirebase()) {
      const id = randomUUID(), now = new Date();
      const book = { title: dto.title, author: dto.author, isbn: dto.isbn ?? '', owner_id: ownerId,
        count: 1, status: BookStatus.AVAILABLE, forSale: false, genre: dto.genre ?? null, tags: dto.tags ?? [], createdAt: now, updatedAt: now };
      await this.firestoreService.collection('books').doc(id).set(book);
      return { id, ...book, isAvailable: true };
    }
    return this.mapSqlite(this.sqliteService.createBook({ title: dto.title, author: dto.author, isbn: dto.isbn || '', owner_id: ownerId }));
  }

  async findAll(query?: string, forSale?: boolean): Promise<Book[]> {
    if (this.usesFirebase()) {
      const snapshot = await this.firestoreService.collection('books').get();
      const q = query?.toLowerCase();
      return snapshot.docs
        .map((doc) => this.mapFirestoreBook(this.firestoreService.docToData<Book>(doc)))
        .filter(
          (book) =>
            !q ||
            book.title.toLowerCase().includes(q) ||
            book.author.toLowerCase().includes(q) ||
            book.isbn?.toLowerCase().includes(q),
        )
        .filter((book) => !forSale || book.forSale === true);
    }
    if (!this.sqliteService.isReady()) return [];
    return this.sqliteService.findAllBooks(query).map((book) => this.mapSqlite(book));
  }

  async findOne(id: string, userId?: string): Promise<Book> {
    if (this.usesFirebase()) {
      const doc = await this.firestoreService.collection('books').doc(id).get();
      if (!doc.exists) throw new NotFoundException(`Book with ID "${id}" not found`);
      return this.mapFirestoreBook(this.firestoreService.docToData<Book>(doc));
    }
    const book = this.sqliteService.isReady() ? this.sqliteService.findBookById(id) : undefined;
    if (!book) throw new NotFoundException(`Book with ID "${id}" not found`);
    return this.mapSqlite(book);
  }

  async update(id: string, dto: UpdateBookDto): Promise<Book> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('books').doc(id);
      if (!(await ref.get()).exists) throw new NotFoundException(`Book with ID "${id}" not found`);
      await ref.update({ ...dto, updatedAt: new Date() });
      return this.findOne(id);
    }
    try { return this.mapSqlite(this.sqliteService.updateBook(id, { title: dto.title, author: dto.author, isbn: dto.isbn })); }
    catch { throw new NotFoundException(`Book with ID "${id}" not found`); }
  }

  async remove(id: string): Promise<void> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('books').doc(id);
      if (!(await ref.get()).exists) throw new NotFoundException(`Book with ID "${id}" not found`);
      await ref.delete(); return;
    }
    try { this.sqliteService.deleteBook(id); } catch { throw new NotFoundException(`Book with ID "${id}" not found`); }
  }

  private mapSqlite(book: any): Book {
    const mapped: Book = {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      owner_id: book.owner_id,
      status: book.status || BookStatus.AVAILABLE,
      count: book.count ?? 1,
      forSale: false,
      createdAt: new Date(book.createdAt),
      updatedAt: new Date(book.updatedAt),
    };
    return this.withAvailability(mapped);
  }

  private mapFirestoreBook(book: Book): Book {
    return this.withAvailability({
      ...book,
      count: book.count ?? 1,
      status: book.status || BookStatus.AVAILABLE,
    });
  }

  private withAvailability(book: Book): Book {
    const status = String(book.status || '').toLowerCase();
    const isAvailable =
      book.isAvailable === true ||
      status === '' ||
      status === 'available' ||
      status === 'new';
    return { ...book, isAvailable };
  }
}
