import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';

export interface Notification {
  id: string;
  member_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(memberId: string): Promise<Notification[]> {
    if (!usesFirebase(this.configService, this.firestoreService)) return [];
    const snapshot = await this.firestoreService.collection('notifications').where('member_id', '==', memberId).get();
    return snapshot.docs.map((doc) => this.firestoreService.docToData<Notification>(doc));
  }

  async getUnreadCount(memberId: string): Promise<number> {
    if (!usesFirebase(this.configService, this.firestoreService)) return 0;
    const snapshot = await this.firestoreService.collection('notifications')
      .where('member_id', '==', memberId).where('read', '==', false).get();
    return snapshot.size;
  }

  async markAsRead(id: string): Promise<Notification> {
    if (!usesFirebase(this.configService, this.firestoreService)) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }
    const ref = this.firestoreService.collection('notifications').doc(id);
    if (!(await ref.get()).exists) throw new NotFoundException(`Notification with ID "${id}" not found`);
    await ref.update({ read: true, updatedAt: new Date() });
    return this.firestoreService.docToData<Notification>(await ref.get());
  }

  async markAllAsRead(memberId: string): Promise<void> {
    if (!usesFirebase(this.configService, this.firestoreService)) return;
    const snapshot = await this.firestoreService.collection('notifications')
      .where('member_id', '==', memberId).where('read', '==', false).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.update({ read: true, updatedAt: new Date() })));
  }

  async remove(id: string): Promise<void> {
    if (!usesFirebase(this.configService, this.firestoreService)) return;
    const ref = this.firestoreService.collection('notifications').doc(id);
    if (!(await ref.get()).exists) throw new NotFoundException(`Notification with ID "${id}" not found`);
    await ref.delete();
  }

  async removeAll(memberId: string): Promise<void> {
    if (!usesFirebase(this.configService, this.firestoreService)) return;
    const snapshot = await this.firestoreService.collection('notifications').where('member_id', '==', memberId).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }
}

