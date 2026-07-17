import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateReviewDto } from '../dto/review.dto';
import { Review } from './review.interface';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';
import { RatingsService } from '../ratings/ratings.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly sqliteService: SqliteService, private readonly firestoreService: FirestoreService, private readonly configService: ConfigService, private readonly emailService: EmailService, private readonly membersService: MembersService, private readonly booksService: BooksService, private readonly ratingsService: RatingsService) {}
  private usesFirebase(): boolean { return usesFirebase(this.configService, this.firestoreService); }
  private getPreferredStorage(): 'sqlite' { return 'sqlite'; }
  async create(dto: CreateReviewDto, memberId: string): Promise<Review> {
    if (this.usesFirebase()) {
      const existing = await this.firestoreService.collection('reviews').where('bookId', '==', dto.bookId).where('memberId', '==', memberId).limit(1).get(), now = new Date();
      if (!existing.empty) { await existing.docs[0].ref.update({ review: dto.review, transactionId: dto.transactionId ?? null, status: 'pending', updatedAt: now }); return this.doc(existing.docs[0].id, { ...existing.docs[0].data(), review: dto.review, status: 'pending', updatedAt: now }); }
      const id = randomUUID(), review = { bookId: dto.bookId, memberId, review: dto.review, transactionId: dto.transactionId ?? null, status: 'pending', createdAt: now, updatedAt: now };
      await this.firestoreService.collection('reviews').doc(id).set(review); return this.doc(id, review);
    }
    const db = this.sqliteService.getDatabase(), now = new Date().toISOString(), existing = db.prepare('SELECT * FROM reviews WHERE bookId = ? AND memberId = ?').get(dto.bookId, memberId) as any;
    if (existing) { db.prepare("UPDATE reviews SET review = ?, status = 'pending', updatedAt = ? WHERE id = ?").run(dto.review, now, existing.id); return this.sqlite(db.prepare('SELECT * FROM reviews WHERE id = ?').get(existing.id)); }
    const id = `review-${randomUUID()}`; db.prepare("INSERT INTO reviews (id, bookId, memberId, transactionId, review, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)").run(id, dto.bookId, memberId, dto.transactionId ?? null, dto.review, now, now); return this.sqlite(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id));
  }
  async findAllForBook(bookId: string): Promise<Review[]> { if (this.usesFirebase()) { const s = await this.firestoreService.collection('reviews').where('bookId', '==', bookId).where('status', '==', 'approved').get(); return s.docs.map(d => this.doc(d.id, d.data())); } return (this.sqliteService.getDatabase().prepare("SELECT * FROM reviews WHERE bookId = ? AND status = 'approved' ORDER BY createdAt DESC").all(bookId) as any[]).map(r => this.sqlite(r)); }
  async findPending(): Promise<any[]> { const reviews = this.usesFirebase() ? (await this.firestoreService.collection('reviews').where('status', '==', 'pending').get()).docs.map(d => this.doc(d.id, d.data())) : (this.sqliteService.getDatabase().prepare("SELECT * FROM reviews WHERE status = 'pending' ORDER BY createdAt DESC").all() as any[]).map(r => this.sqlite(r)); return Promise.all(reviews.map(async review => ({ ...review, bookName: (await this.booksService.findOne(review.bookId).catch(() => null))?.title ?? 'Unknown Book', memberName: (await this.membersService.findOne(review.memberId).catch(() => null))?.name ?? 'Unknown User' }))); }
  async approve(id: string, adminId: string): Promise<Review> { const review = await this.updateStatus(id, 'approved', adminId); await this.notify(review, true); return review; }
  async reject(id: string, adminId: string, reason: string): Promise<Review> { const review = await this.updateStatus(id, 'rejected', adminId, reason); await this.notify(review, false, reason); return review; }
  async remove(id: string): Promise<void> { if (this.usesFirebase()) { await this.firestoreService.collection('reviews').doc(id).delete(); return; } const result = this.sqliteService.getDatabase().prepare('DELETE FROM reviews WHERE id = ?').run(id); if (!result.changes) throw new NotFoundException('Review not found'); }
  private async updateStatus(id: string, status: 'approved' | 'rejected', adminId: string, reason?: string): Promise<Review> { const now = new Date(); if (this.usesFirebase()) { const ref = this.firestoreService.collection('reviews').doc(id), current = await ref.get(); if (!current.exists || current.data()!.status !== 'pending') throw new NotFoundException('Review not found or already processed'); const updates = { status, approvedBy: adminId, approvedAt: now, rejectionReason: reason ?? null, updatedAt: now }; await ref.update(updates); return this.doc(id, { ...current.data(), ...updates }); } const db = this.sqliteService.getDatabase(), result = db.prepare("UPDATE reviews SET status = ?, approvedBy = ?, approvedAt = ?, rejectionReason = ?, updatedAt = ? WHERE id = ? AND status = 'pending'").run(status, adminId, now.toISOString(), reason ?? null, now.toISOString(), id); if (!result.changes) throw new NotFoundException('Review not found or already processed'); return this.sqlite(db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)); }
  private doc(id: string, data: any): Review { return { id, ...data, transactionId: data.transactionId ?? undefined, createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt), updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt), approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined }; }
  private sqlite(row: any): Review { return this.doc(row.id, row); }
  private async notify(review: Review, approved: boolean, reason?: string): Promise<void> { try { const [member, book] = await Promise.all([this.membersService.findOne(review.memberId), this.booksService.findOne(review.bookId)]); await this.emailService.sendReviewApprovalEmail(member.email, member.name, book.title, approved, reason); } catch {} }
}
