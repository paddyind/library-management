import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { Transaction } from './transaction.interface';
import { BookStatus } from '../books/book.interface';

function toDate(value: unknown): Date {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (value) {
    return new Date(String(value));
  }
  return new Date();
}

function mapTransaction(id: string, data: FirebaseFirestore.DocumentData): Transaction {
  return {
    id,
    bookId: String(data.bookId),
    memberId: String(data.memberId),
    type: data.type,
    status: data.status,
    borrowedDate: data.borrowedDate ? toDate(data.borrowedDate) : undefined,
    dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
    returnDate: data.returnDate ? toDate(data.returnDate) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export type EnrichedTransaction = Transaction & {
  book?: { id: string; title: string; author: string; isbn: string; status?: string } | null;
  member?: { id: string; name: string; email: string; phone?: string } | null;
};

@Injectable()
export class TransactionsFirestoreService {
  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  isActive(): boolean {
    return usesFirebase(this.configService, this.firestoreService);
  }

  private collection() {
    return this.firestoreService.collection('transactions');
  }

  private books() {
    return this.firestoreService.collection('books');
  }

  private profiles() {
    return this.firestoreService.collection('profiles');
  }

  private async enrich(tx: Transaction): Promise<EnrichedTransaction> {
    const [bookDoc, memberDoc] = await Promise.all([
      this.books().doc(tx.bookId).get(),
      this.profiles().doc(tx.memberId).get(),
    ]);

    const book = bookDoc.exists
      ? {
          id: bookDoc.id,
          title: String(bookDoc.data()?.title || 'Unknown'),
          author: String(bookDoc.data()?.author || 'Unknown'),
          isbn: String(bookDoc.data()?.isbn || ''),
          status: bookDoc.data()?.status,
        }
      : null;

    const member = memberDoc.exists
      ? {
          id: memberDoc.id,
          name: String(memberDoc.data()?.name || memberDoc.data()?.email || 'Unknown'),
          email: String(memberDoc.data()?.email || ''),
          phone: memberDoc.data()?.phone ? String(memberDoc.data()?.phone) : undefined,
        }
      : null;

    return { ...tx, book, member };
  }

  private async enrichMany(txs: Transaction[]): Promise<EnrichedTransaction[]> {
    return Promise.all(txs.map((tx) => this.enrich(tx)));
  }

  async create(dto: CreateTransactionDto, memberId: string): Promise<EnrichedTransaction> {
    const { bookId, type } = dto;
    if (type !== 'borrow') {
      throw new BadRequestException('Only borrow transactions are supported via this endpoint');
    }

    const bookRef = this.books().doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    const bookData = bookSnap.data()!;
    const totalCopies = Math.max(1, Number(bookData.count) || 1);
    const status = String(bookData.status || '').toLowerCase();
    if (['damaged', 'reserved'].includes(status)) {
      throw new ConflictException('This book cannot be borrowed right now');
    }

    const loansForBook = await this.collection().where('bookId', '==', bookId).get();
    const activeLoans = loansForBook.docs.filter((d) =>
      ['active', 'pending_return_approval'].includes(String(d.data()?.status)),
    );
    const alreadyMine = activeLoans.find((d) => d.data()?.memberId === memberId);
    if (alreadyMine) {
      throw new ConflictException('You already have this book on loan');
    }
    if (activeLoans.length >= totalCopies) {
      throw new ConflictException(
        `All ${totalCopies} cop${totalCopies === 1 ? 'y is' : 'ies are'} currently on loan`,
      );
    }

    const now = new Date();
    const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const id = randomUUID();

    const doc = {
      bookId,
      memberId,
      type: 'borrow',
      status: 'active',
      borrowedDate: now,
      dueDate,
      returnDate: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().doc(id).set(doc);

    const onLoanAfter = activeLoans.length + 1;
    const availableAfter = totalCopies - onLoanAfter;
    await bookRef.update({
      status: availableAfter > 0 ? BookStatus.AVAILABLE : BookStatus.BORROWED,
      updatedAt: now,
    });

    return this.enrich(mapTransaction(id, doc));
  }

  async findAll(bookId?: string): Promise<EnrichedTransaction[]> {
    const snapshot = bookId
      ? await this.collection().where('bookId', '==', bookId).get()
      : await this.collection().get();

    const txs = snapshot.docs.map((doc) => mapTransaction(doc.id, doc.data()));
    txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.enrichMany(txs);
  }

  async findMemberTransactions(memberId: string): Promise<EnrichedTransaction[]> {
    const snapshot = await this.collection().where('memberId', '==', memberId).get();
    const txs = snapshot.docs.map((doc) => mapTransaction(doc.id, doc.data()));
    txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.enrichMany(txs);
  }

  async findOne(id: string): Promise<EnrichedTransaction> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }
    return this.enrich(mapTransaction(doc.id, doc.data()!));
  }

  async returnBook(transactionId: string, memberId: string): Promise<EnrichedTransaction> {
    const ref = this.collection().doc(transactionId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const data = doc.data()!;
    if (data.memberId !== memberId) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const updates = {
      status: 'pending_return_approval',
      returnDate: new Date(),
      updatedAt: new Date(),
    };

    await ref.update(updates);
    return this.enrich(mapTransaction(transactionId, { ...data, ...updates }));
  }

  async renew(transactionId: string, memberId: string): Promise<EnrichedTransaction> {
    const ref = this.collection().doc(transactionId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const data = doc.data()!;
    if (data.memberId !== memberId || data.status !== 'active') {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const updates = { dueDate, updatedAt: new Date() };
    await ref.update(updates);
    return this.enrich(mapTransaction(transactionId, { ...data, ...updates }));
  }

  async approveReturn(transactionId: string): Promise<EnrichedTransaction> {
    const ref = this.collection().doc(transactionId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const data = doc.data()!;
    const updates = { status: 'completed', updatedAt: new Date() };
    await ref.update(updates);

    if (data.bookId) {
      await this.syncBookInventoryStatus(String(data.bookId));
    }

    return this.enrich(mapTransaction(transactionId, { ...data, ...updates }));
  }

  async rejectReturn(transactionId: string, reason?: string): Promise<EnrichedTransaction> {
    const ref = this.collection().doc(transactionId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const updates = {
      status: 'active',
      returnDate: null,
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    };
    await ref.update(updates);
    return this.enrich(mapTransaction(transactionId, { ...doc.data()!, ...updates }));
  }

  /** Align book.status with remaining copies after loan changes. */
  private async syncBookInventoryStatus(bookId: string): Promise<void> {
    const bookRef = this.books().doc(bookId);
    const bookSnap = await bookRef.get();
    if (!bookSnap.exists) return;

    const bookData = bookSnap.data()!;
    const totalCopies = Math.max(1, Number(bookData.count) || 1);
    const current = String(bookData.status || '').toLowerCase();
    if (['damaged', 'reserved'].includes(current)) return;

    const loans = await this.collection().where('bookId', '==', bookId).get();
    const onLoan = loans.docs.filter((d) =>
      ['active', 'pending_return_approval'].includes(String(d.data()?.status)),
    ).length;
    const available = Math.max(0, totalCopies - onLoan);

    await bookRef.update({
      status: available > 0 ? BookStatus.AVAILABLE : BookStatus.BORROWED,
      updatedAt: new Date(),
    });
  }
}
