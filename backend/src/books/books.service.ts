import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book, BookStatus } from './book.interface';

const ACTIVE_LOAN_STATUSES = new Set(['active', 'pending_return_approval']);

@Injectable()
export class BooksService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  private usesFirebase(): boolean {
    return usesFirebase(this.configService, this.firestoreService);
  }

  async create(dto: CreateBookDto, ownerId: string): Promise<Book> {
    if (this.usesFirebase()) {
      const id = randomUUID();
      const now = new Date();
      const book = {
        title: dto.title,
        author: dto.author,
        isbn: dto.isbn ?? '',
        owner_id: ownerId,
        count: dto.count ?? 1,
        status: this.normalizeStatus(dto.status) ?? BookStatus.AVAILABLE,
        forSale: dto.forSale ?? false,
        price: dto.forSale ? (dto.price ?? 0) : null,
        genre: dto.genre ?? null,
        tags: dto.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };
      await this.firestoreService.collection('books').doc(id).set(book);
      return this.withAvailability({ id, ...book } as Book, 0);
    }
    return this.mapSqlite(
      this.sqliteService.createBook({
        title: dto.title,
        author: dto.author,
        isbn: dto.isbn || '',
        owner_id: ownerId,
      }),
    );
  }

  async findAll(query?: string, forSale?: boolean): Promise<Book[]> {
    if (this.usesFirebase()) {
      const [snapshot, loanCounts] = await Promise.all([
        this.firestoreService.collection('books').get(),
        this.getActiveLoanCounts(),
      ]);
      const q = query?.toLowerCase();
      return snapshot.docs
        .map((doc) =>
          this.withAvailability(
            this.firestoreService.docToData<Book>(doc),
            loanCounts.get(doc.id) || 0,
          ),
        )
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

  async findOne(id: string, _userId?: string): Promise<Book> {
    if (this.usesFirebase()) {
      const doc = await this.firestoreService.collection('books').doc(id).get();
      if (!doc.exists) throw new NotFoundException(`Book with ID "${id}" not found`);
      const onLoan = await this.countActiveLoans(id);
      return this.withAvailability(this.firestoreService.docToData<Book>(doc), onLoan);
    }
    const book = this.sqliteService.isReady() ? this.sqliteService.findBookById(id) : undefined;
    if (!book) throw new NotFoundException(`Book with ID "${id}" not found`);
    return this.mapSqlite(book);
  }

  async update(id: string, dto: UpdateBookDto): Promise<Book> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('books').doc(id);
      if (!(await ref.get()).exists) throw new NotFoundException(`Book with ID "${id}" not found`);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(dto as Record<string, unknown>)) {
        if (value === undefined) continue;
        if (key === 'status') {
          const normalized = this.normalizeStatus(String(value));
          if (normalized) patch.status = normalized;
          continue;
        }
        patch[key] = value;
      }

      await ref.update(patch);
      // Recompute availability status from real loans vs count
      await this.syncInventoryStatus(id);
      return this.findOne(id);
    }
    try {
      return this.mapSqlite(
        this.sqliteService.updateBook(id, {
          title: dto.title,
          author: dto.author,
          isbn: dto.isbn,
        }),
      );
    } catch {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }

  async remove(id: string): Promise<void> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('books').doc(id);
      if (!(await ref.get()).exists) throw new NotFoundException(`Book with ID "${id}" not found`);
      await ref.delete();
      return;
    }
    try {
      this.sqliteService.deleteBook(id);
    } catch {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }
  }

  /** Keep book.status in sync with remaining copies (unless damaged/reserved). */
  async syncInventoryStatus(bookId: string): Promise<{ availableCount: number; onLoanCount: number }> {
    const bookRef = this.firestoreService.collection('books').doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) {
      return { availableCount: 0, onLoanCount: 0 };
    }

    const data = bookSnap.data()!;
    const total = Math.max(1, Number(data.count) || 1);
    const onLoanCount = await this.countActiveLoans(bookId);
    const availableCount = Math.max(0, total - onLoanCount);
    const current = String(data.status || '').toLowerCase();

    // Don't override damaged / reserved catalog states from loan math
    if (!['damaged', 'reserved'].includes(current)) {
      const nextStatus = availableCount > 0 ? BookStatus.AVAILABLE : BookStatus.BORROWED;
      if (data.status !== nextStatus) {
        await bookRef.update({ status: nextStatus, updatedAt: new Date() });
      }
    }

    return { availableCount, onLoanCount };
  }

  private async getActiveLoanCounts(): Promise<Map<string, number>> {
    const snapshot = await this.firestoreService.collection('transactions').get();
    const counts = new Map<string, number>();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!ACTIVE_LOAN_STATUSES.has(String(data.status))) continue;
      const bookId = String(data.bookId || '');
      if (!bookId) continue;
      counts.set(bookId, (counts.get(bookId) || 0) + 1);
    }
    return counts;
  }

  private async countActiveLoans(bookId: string): Promise<number> {
    const snapshot = await this.firestoreService
      .collection('transactions')
      .where('bookId', '==', bookId)
      .get();
    return snapshot.docs.filter((d) => ACTIVE_LOAN_STATUSES.has(String(d.data()?.status))).length;
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
    return this.withAvailability(mapped, 0);
  }

  private withAvailability(book: Book, onLoanCount: number): Book {
    const total = Math.max(1, Number(book.count) || 1);
    const onLoan = Math.max(0, onLoanCount);
    const availableCount = Math.max(0, total - onLoan);
    const status = String(book.status || '').toLowerCase();
    const blocked = ['damaged', 'reserved'].includes(status);
    const isAvailable = !blocked && availableCount > 0;

    return {
      ...book,
      count: total,
      onLoanCount: onLoan,
      availableCount,
      status: book.status || BookStatus.AVAILABLE,
      isAvailable,
    };
  }

  /** Map UI / API status strings onto BookStatus Title Case values. */
  private normalizeStatus(status?: string | null): BookStatus | string | undefined {
    if (!status) return undefined;
    switch (String(status).trim().toLowerCase()) {
      case 'available':
      case 'new':
        return BookStatus.AVAILABLE;
      case 'borrowed':
      case 'lent':
      case 'with_me':
        return BookStatus.BORROWED;
      case 'reserved':
        return BookStatus.RESERVED;
      case 'damaged':
        return BookStatus.DAMAGED;
      case 'onsale':
      case 'on_sale':
        return BookStatus.ONSALE;
      default:
        return status;
    }
  }
}
