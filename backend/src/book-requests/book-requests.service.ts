import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../config/firestore.service';
import { SqliteService } from '../config/sqlite.service';
import { usesFirebase } from '../config/storage.util';
import { CreateBookRequestDto } from '../dto/book-request.dto';
import { BookRequest } from './book-request.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class BookRequestsService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  async create(createBookRequestDto: CreateBookRequestDto, member: Member): Promise<BookRequest> {
    const now = new Date();
    const request = { id: randomUUID(), ...createBookRequestDto, member_id: member.id, member, createdAt: now, updatedAt: now };
    if (usesFirebase(this.configService, this.firestoreService)) {
      await this.firestoreService.collection('bookRequests').doc(request.id).set(request);
      return request as BookRequest;
    }
    this.sqliteService.getDatabase().prepare(
      'INSERT INTO book_requests (id, title, author, member_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(request.id, request.title, request.author, member.id, now.toISOString(), now.toISOString());
    return request as BookRequest;
  }

  async findAll(): Promise<BookRequest[]> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const snapshot = await this.firestoreService.collection('bookRequests').get();
      return snapshot.docs.map((doc) => this.firestoreService.docToData<BookRequest>(doc));
    }
    return this.sqliteService.getDatabase().prepare('SELECT * FROM book_requests').all() as BookRequest[];
  }

  async findOne(id: string): Promise<BookRequest> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const doc = await this.firestoreService.collection('bookRequests').doc(id).get();
      if (!doc.exists) throw new NotFoundException(`Book request with ID "${id}" not found`);
      return this.firestoreService.docToData<BookRequest>(doc);
    }
    const request = this.sqliteService.getDatabase().prepare('SELECT * FROM book_requests WHERE id = ?').get(id) as BookRequest;
    if (!request) throw new NotFoundException(`Book request with ID "${id}" not found`);
    return request;
  }

  async findByMember(memberId: string): Promise<BookRequest[]> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const snapshot = await this.firestoreService.collection('bookRequests').where('member_id', '==', memberId).get();
      return snapshot.docs.map((doc) => this.firestoreService.docToData<BookRequest>(doc));
    }
    return this.sqliteService.getDatabase().prepare('SELECT * FROM book_requests WHERE member_id = ?').all(memberId) as BookRequest[];
  }

  async remove(id: string): Promise<void> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const ref = this.firestoreService.collection('bookRequests').doc(id);
      if (!(await ref.get()).exists) throw new NotFoundException(`Book request with ID "${id}" not found`);
      await ref.delete();
      return;
    }
    const result = this.sqliteService.getDatabase().prepare('DELETE FROM book_requests WHERE id = ?').run(id);
    if (!result.changes) throw new NotFoundException(`Book request with ID "${id}" not found`);
  }
}
