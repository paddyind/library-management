import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../config/firestore.service';
import { SqliteService } from '../config/sqlite.service';
import { usesFirebase } from '../config/storage.util';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { Reservation } from './reservation.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<Reservation[]> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const snapshot = await this.firestoreService.collection('reservations').get();
      return snapshot.docs.map((doc) => this.firestoreService.docToData<Reservation>(doc));
    }
    return this.sqliteService.getDatabase().prepare('SELECT * FROM reservations').all() as Reservation[];
  }

  async findOne(id: number): Promise<Reservation> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const doc = await this.firestoreService.collection('reservations').doc(String(id)).get();
      if (!doc.exists) throw new NotFoundException(`Reservation with ID "${id}" not found`);
      return this.firestoreService.docToData<Reservation>(doc);
    }
    const reservation = this.sqliteService.getDatabase().prepare('SELECT * FROM reservations WHERE id = ?').get(id) as Reservation;
    if (!reservation) throw new NotFoundException(`Reservation with ID "${id}" not found`);
    return reservation;
  }

  async create(createReservationDto: CreateReservationDto, member: Member): Promise<Reservation> {
    const now = new Date();
    const id = Date.now();
    const reservation = { id, ...createReservationDto, member_id: member.id, member, status: 'reserved' as const, createdAt: now, updatedAt: now };
    if (usesFirebase(this.configService, this.firestoreService)) {
      await this.firestoreService.collection('reservations').doc(String(id)).set(reservation);
      return reservation as unknown as Reservation;
    }
    this.sqliteService.getDatabase().prepare(
      'INSERT INTO reservations (id, member_id, book_id, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, member.id, (createReservationDto as any).book_id ?? (createReservationDto as any).bookId, 'reserved', now.toISOString(), now.toISOString());
    return reservation as unknown as Reservation;
  }

  async cancel(id: number): Promise<Reservation> {
    if (usesFirebase(this.configService, this.firestoreService)) {
      const ref = this.firestoreService.collection('reservations').doc(String(id));
      if (!(await ref.get()).exists) throw new NotFoundException(`Reservation with ID "${id}" not found`);
      await ref.update({ status: 'cancelled', updatedAt: new Date() });
      return this.firestoreService.docToData<Reservation>(await ref.get());
    }
    const result = this.sqliteService.getDatabase().prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?').run('cancelled', new Date().toISOString(), id);
    if (!result.changes) throw new NotFoundException(`Reservation with ID "${id}" not found`);
    return this.findOne(id);
  }
}
