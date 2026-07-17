import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { getLegacyStorage, usesFirebase } from '../config/storage.util';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { Transaction } from './transaction.interface';

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

@Injectable()
export class TransactionsFirestoreService {
  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  isActive(): boolean {
    return usesFirebase(this.configService, this.firestoreService);
  }

  private collection() {
    return this.firestoreService.collection('transactions');
  }

  async create(dto: CreateTransactionDto, memberId: string): Promise<Transaction> {
    const { bookId, type } = dto;
    const now = new Date();
    const dueDate = type === 'borrow' ? new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) : null;
    const id = randomUUID();

    const doc = {
      bookId,
      memberId,
      type,
      status: type === 'borrow' ? 'active' : 'completed',
      borrowedDate: type === 'borrow' ? now : null,
      dueDate,
      returnDate: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().doc(id).set(doc);
    return mapTransaction(id, doc);
  }

  async findAll(bookId?: string): Promise<Transaction[]> {
    const snapshot = bookId
      ? await this.collection().where('bookId', '==', bookId).get()
      : await this.collection().get();

    return snapshot.docs.map((doc) => mapTransaction(doc.id, doc.data()));
  }

  async findMemberTransactions(memberId: string): Promise<Transaction[]> {
    const snapshot = await this.collection().where('memberId', '==', memberId).get();
    return snapshot.docs.map((doc) => mapTransaction(doc.id, doc.data()));
  }

  async findOne(id: string): Promise<Transaction> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }
    return mapTransaction(doc.id, doc.data()!);
  }

  async returnBook(transactionId: string, memberId: string): Promise<Transaction> {
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
    return mapTransaction(transactionId, { ...data, ...updates });
  }

  async renew(transactionId: string, memberId: string): Promise<Transaction> {
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
    return mapTransaction(transactionId, { ...data, ...updates });
  }

  async approveReturn(transactionId: string): Promise<Transaction> {
    const ref = this.collection().doc(transactionId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundException(`Transaction with ID "${transactionId}" not found`);
    }

    const updates = { status: 'completed', updatedAt: new Date() };
    await ref.update(updates);
    return mapTransaction(transactionId, { ...doc.data()!, ...updates });
  }

  async rejectReturn(transactionId: string, reason?: string): Promise<Transaction> {
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
    return mapTransaction(transactionId, { ...doc.data()!, ...updates });
  }
}

export function legacyDataRequired(): never {
  throw new ServiceUnavailableException(
    'This endpoint is not yet available with DATA_STORAGE=firebase. Use legacy mode or check TECH-MIGRATION.md.',
  );
}
