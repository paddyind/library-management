import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating } from './rating.interface';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';

@Injectable()
export class RatingsService {
  constructor(private readonly sqliteService: SqliteService, private readonly firestoreService: FirestoreService, private readonly configService: ConfigService, private readonly emailService: EmailService, private readonly membersService: MembersService, private readonly booksService: BooksService) {}
  private usesFirebase(): boolean { return usesFirebase(this.configService, this.firestoreService); }
  private getPreferredStorage(): 'sqlite' { return 'sqlite'; }
  async create(dto: CreateRatingDto, memberId: string): Promise<Rating> {
    if (this.usesFirebase()) { const existing = await this.firestoreService.collection('ratings').where('bookId', '==', dto.bookId).where('memberId', '==', memberId).limit(1).get(), now = new Date(); if (!existing.empty) { await existing.docs[0].ref.update({ rating: dto.rating, transactionId: dto.transactionId ?? null, status: 'approved', updatedAt: now }); return this.doc(existing.docs[0].id, { ...existing.docs[0].data(), rating: dto.rating, status: 'approved', updatedAt: now }); } const id = randomUUID(), rating = { bookId: dto.bookId, memberId, rating: dto.rating, transactionId: dto.transactionId ?? null, status: 'approved', createdAt: now, updatedAt: now }; await this.firestoreService.collection('ratings').doc(id).set(rating); return this.doc(id, rating); }
    const db = this.sqliteService.getDatabase(), now = new Date().toISOString(), existing = db.prepare('SELECT * FROM ratings WHERE bookId = ? AND memberId = ?').get(dto.bookId, memberId) as any;
    if (existing) { db.prepare("UPDATE ratings SET rating = ?, status = 'approved', updatedAt = ? WHERE id = ?").run(dto.rating, now, existing.id); return this.sqlite(db.prepare('SELECT * FROM ratings WHERE id = ?').get(existing.id)); }
    const id = `rating-${randomUUID()}`; db.prepare("INSERT INTO ratings (id, bookId, memberId, transactionId, rating, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)").run(id, dto.bookId, memberId, dto.transactionId ?? null, dto.rating, now, now); return this.sqlite(db.prepare('SELECT * FROM ratings WHERE id = ?').get(id));
  }
  async findAverageForBook(bookId: string): Promise<number> { const ratings = this.usesFirebase() ? (await this.firestoreService.collection('ratings').where('bookId', '==', bookId).where('status', '==', 'approved').get()).docs.map(d => d.data().rating as number) : (this.sqliteService.getDatabase().prepare("SELECT rating FROM ratings WHERE bookId = ? AND status = 'approved'").all(bookId) as any[]).map(r => r.rating); return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0; }
  async findPending(): Promise<Rating[]> { if (this.usesFirebase()) return (await this.firestoreService.collection('ratings').where('status', '==', 'pending').get()).docs.map(d => this.doc(d.id, d.data())); return (this.sqliteService.getDatabase().prepare("SELECT * FROM ratings WHERE status = 'pending'").all() as any[]).map(r => this.sqlite(r)); }
  async approve(id: string, adminId: string): Promise<Rating> { return this.updateStatus(id, 'approved', adminId); }
  async reject(id: string, adminId: string, reason: string): Promise<Rating> { return this.updateStatus(id, 'rejected', adminId, reason); }
  async remove(id: string): Promise<void> { if (this.usesFirebase()) { await this.firestoreService.collection('ratings').doc(id).delete(); return; } if (!this.sqliteService.getDatabase().prepare('DELETE FROM ratings WHERE id = ?').run(id).changes) throw new NotFoundException('Rating not found'); }
  private async updateStatus(id: string, status: 'approved' | 'rejected', adminId: string, reason?: string): Promise<Rating> { const now = new Date(); if (this.usesFirebase()) { const ref = this.firestoreService.collection('ratings').doc(id), current = await ref.get(); if (!current.exists) throw new NotFoundException('Rating not found'); const updates = { status, approvedBy: adminId, rejectionReason: reason ?? null, approvedAt: now, updatedAt: now }; await ref.update(updates); return this.doc(id, { ...current.data(), ...updates }); } const db = this.sqliteService.getDatabase(); if (!db.prepare('SELECT id FROM ratings WHERE id = ?').get(id)) throw new NotFoundException('Rating not found'); db.prepare('UPDATE ratings SET status = ?, approvedBy = ?, rejectionReason = ?, approvedAt = ?, updatedAt = ? WHERE id = ?').run(status, adminId, reason ?? null, now.toISOString(), now.toISOString(), id); return this.sqlite(db.prepare('SELECT * FROM ratings WHERE id = ?').get(id)); }
  private doc(id: string, data: any): Rating { return { id, ...data, transactionId: data.transactionId ?? undefined, createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt), updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt), approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined }; }
  private sqlite(row: any): Rating { return this.doc(row.id, row); }
}
