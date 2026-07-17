import * as admin from 'firebase-admin';
import { BackupData, IdMap } from './backup-types';

export interface FirestoreMigratorOptions {
  projectId: string;
  prefix: string;
  dryRun: boolean;
}

export interface FirestoreMigrationResult {
  upserted: Record<string, number>;
  skipped: Record<string, number>;
  errors: string[];
}

function toTimestamp(value: unknown): admin.firestore.Timestamp | admin.firestore.FieldValue {
  if (value == null || value === '') {
    return admin.firestore.FieldValue.serverTimestamp();
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return admin.firestore.FieldValue.serverTimestamp();
  }
  return admin.firestore.Timestamp.fromDate(date);
}

function mapUserId(idMap: IdMap, legacyId: unknown, fallback?: string): string | null {
  if (legacyId == null) {
    return fallback ?? null;
  }
  const key = String(legacyId);
  return idMap[key] ?? fallback ?? null;
}

export class FirestoreMigrator {
  private db: admin.firestore.Firestore;

  constructor(private readonly options: FirestoreMigratorOptions) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: options.projectId,
      });
    }
    this.db = admin.firestore();
  }

  collection(name: string): admin.firestore.CollectionReference {
    return this.db.collection(`${this.options.prefix}__${name}`);
  }

  async migrate(
    data: BackupData,
    idMap: IdMap,
    fallbackOwnerId: string | null,
    isDemoLegacyId: (id: string) => boolean,
  ): Promise<FirestoreMigrationResult> {
    const result: FirestoreMigrationResult = {
      upserted: {},
      skipped: {},
      errors: [],
    };

    const bump = (key: string, field: 'upserted' | 'skipped') => {
      const bucket = field === 'upserted' ? result.upserted : result.skipped;
      bucket[key] = (bucket[key] ?? 0) + 1;
    };

    for (const [legacyId, keycloakSub] of Object.entries(idMap)) {
      const user = data.users.find((u) => u.id === legacyId);
      if (!user) {
        continue;
      }

      try {
        await this.upsert('profiles', keycloakSub, {
          email: user.email,
          name: user.name,
          role: user.role,
          keycloakSub,
          legacyUserId: legacyId,
          phone: user.phone ?? null,
          createdAt: toTimestamp(user.createdAt),
          updatedAt: toTimestamp(user.updatedAt),
        });
        bump('profiles', 'upserted');
      } catch (error: any) {
        result.errors.push(`profiles/${keycloakSub}: ${error.message}`);
      }
    }

    for (const book of data.books) {
      const bookId = String(book.id);
      let ownerId = mapUserId(idMap, book.owner_id);

      if (!ownerId && book.owner_id && isDemoLegacyId(String(book.owner_id))) {
        ownerId = fallbackOwnerId;
      }

      if (!ownerId) {
        bump('books', 'skipped');
        continue;
      }

      try {
        await this.upsert('books', bookId, {
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? '',
          owner_id: ownerId,
          count: book.count ?? 1,
          status: normalizeStatus(book.status),
          forSale: book.forSale === true || book.forSale === 1,
          price: book.price ?? null,
          genre: book.genre ?? null,
          tags: book.tags ?? [],
          createdAt: toTimestamp(book.createdAt),
          updatedAt: toTimestamp(book.updatedAt),
        });
        bump('books', 'upserted');
      } catch (error: any) {
        result.errors.push(`books/${bookId}: ${error.message}`);
      }
    }

    for (const tx of data.transactions) {
      const txId = String(tx.id);
      const memberId = mapUserId(idMap, tx.memberId);
      if (!memberId) {
        bump('transactions', 'skipped');
        continue;
      }

      try {
        await this.upsert('transactions', txId, {
          bookId: String(tx.bookId),
          memberId,
          type: tx.type,
          status: tx.status,
          borrowedDate: tx.borrowedDate ? toTimestamp(tx.borrowedDate) : null,
          dueDate: tx.dueDate ? toTimestamp(tx.dueDate) : null,
          returnDate: tx.returnDate ? toTimestamp(tx.returnDate) : null,
          createdAt: toTimestamp(tx.createdAt),
          updatedAt: toTimestamp(tx.updatedAt),
        });
        bump('transactions', 'upserted');
      } catch (error: any) {
        result.errors.push(`transactions/${txId}: ${error.message}`);
      }
    }

    for (const rating of data.ratings) {
      const ratingId = String(rating.id);
      const memberId = mapUserId(idMap, rating.memberId);
      if (!memberId) {
        bump('ratings', 'skipped');
        continue;
      }

      try {
        await this.upsert('ratings', ratingId, {
          bookId: String(rating.bookId),
          memberId,
          transactionId: rating.transactionId ?? null,
          rating: rating.rating,
          status: rating.status ?? 'approved',
          rejectionReason: rating.rejectionReason ?? null,
          approvedBy: mapUserId(idMap, rating.approvedBy),
          approvedAt: rating.approvedAt ? toTimestamp(rating.approvedAt) : null,
          createdAt: toTimestamp(rating.createdAt),
          updatedAt: toTimestamp(rating.updatedAt),
        });
        bump('ratings', 'upserted');
      } catch (error: any) {
        result.errors.push(`ratings/${ratingId}: ${error.message}`);
      }
    }

    for (const review of data.reviews) {
      const reviewId = String(review.id);
      const memberId = mapUserId(idMap, review.memberId);
      if (!memberId) {
        bump('reviews', 'skipped');
        continue;
      }

      try {
        await this.upsert('reviews', reviewId, {
          bookId: String(review.bookId),
          memberId,
          transactionId: review.transactionId ?? null,
          content: review.review ?? review.content,
          status: review.status ?? 'pending',
          rejectionReason: review.rejectionReason ?? null,
          approvedBy: mapUserId(idMap, review.approvedBy),
          approvedAt: review.approvedAt ? toTimestamp(review.approvedAt) : null,
          createdAt: toTimestamp(review.createdAt),
          updatedAt: toTimestamp(review.updatedAt),
        });
        bump('reviews', 'upserted');
      } catch (error: any) {
        result.errors.push(`reviews/${reviewId}: ${error.message}`);
      }
    }

    for (const group of data.groups) {
      const groupId = String(group.id);
      try {
        await this.upsert('groups', groupId, {
          name: group.name,
          description: group.description ?? null,
          permissions: group.permissions ?? null,
          createdAt: toTimestamp(group.created_at ?? group.createdAt),
          updatedAt: toTimestamp(group.updated_at ?? group.updatedAt),
        });
        bump('groups', 'upserted');
      } catch (error: any) {
        result.errors.push(`groups/${groupId}: ${error.message}`);
      }
    }

    for (const member of data.group_members) {
      const memberId = mapUserId(idMap, member.member_id ?? member.memberId);
      if (!memberId) {
        bump('groupMembers', 'skipped');
        continue;
      }

      const groupId = String(member.group_id ?? member.groupId);
      const docId = `${groupId}_${memberId}`;

      try {
        await this.upsert('groupMembers', docId, {
          groupId,
          memberId,
          role: member.role ?? 'member',
          joinedAt: toTimestamp(member.joined_at ?? member.joinedAt ?? member.created_at),
        });
        bump('groupMembers', 'upserted');
      } catch (error: any) {
        result.errors.push(`groupMembers/${docId}: ${error.message}`);
      }
    }

    for (const reservation of data.reservations) {
      const reservationId = String(reservation.id);
      const memberId = mapUserId(idMap, reservation.memberId);
      if (!memberId) {
        bump('reservations', 'skipped');
        continue;
      }

      try {
        await this.upsert('reservations', reservationId, {
          bookId: String(reservation.bookId),
          memberId,
          status: reservation.status ?? 'pending',
          createdAt: toTimestamp(reservation.createdAt),
          updatedAt: toTimestamp(reservation.updatedAt),
        });
        bump('reservations', 'upserted');
      } catch (error: any) {
        result.errors.push(`reservations/${reservationId}: ${error.message}`);
      }
    }

    for (const notification of data.notifications) {
      const notificationId = String(notification.id);
      const memberId = mapUserId(idMap, notification.userId ?? notification.memberId);
      if (!memberId) {
        bump('notifications', 'skipped');
        continue;
      }

      try {
        await this.upsert('notifications', notificationId, {
          memberId,
          type: notification.type,
          message: notification.message ?? notification.title,
          title: notification.title ?? null,
          read: notification.readAt != null || notification.read === true,
          readAt: notification.readAt ? toTimestamp(notification.readAt) : null,
          createdAt: toTimestamp(notification.createdAt),
        });
        bump('notifications', 'upserted');
      } catch (error: any) {
        result.errors.push(`notifications/${notificationId}: ${error.message}`);
      }
    }

    for (const request of data.book_requests) {
      const requestId = String(request.id);
      const requestedBy = mapUserId(idMap, request.requestedBy ?? request.requested_by);
      if (!requestedBy) {
        bump('bookRequests', 'skipped');
        continue;
      }

      try {
        await this.upsert('bookRequests', requestId, {
          title: request.title,
          author: request.author ?? null,
          requestedBy,
          status: request.status ?? 'pending',
          createdAt: toTimestamp(request.createdAt ?? request.created_at),
        });
        bump('bookRequests', 'upserted');
      } catch (error: any) {
        result.errors.push(`bookRequests/${requestId}: ${error.message}`);
      }
    }

    for (const subscription of data.subscriptions) {
      const subscriptionId = String(subscription.id);
      const memberId = mapUserId(idMap, subscription.memberId);
      if (!memberId) {
        bump('subscriptions', 'skipped');
        continue;
      }

      try {
        await this.upsert('subscriptions', subscriptionId, {
          memberId,
          plan: subscription.plan ?? subscription.tier ?? 'basic',
          status: subscription.status ?? 'active',
          expiresAt: subscription.expiresAt ? toTimestamp(subscription.expiresAt) : null,
          createdAt: toTimestamp(subscription.createdAt),
        });
        bump('subscriptions', 'upserted');
      } catch (error: any) {
        result.errors.push(`subscriptions/${subscriptionId}: ${error.message}`);
      }
    }

    return result;
  }

  private async upsert(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    if (this.options.dryRun) {
      return;
    }

    await this.collection(collection).doc(docId).set(data, { merge: true });
  }
}

function normalizeStatus(status: unknown): string {
  if (status == null) {
    return 'Available';
  }
  const value = String(status).toLowerCase();
  if (value === 'available') {
    return 'Available';
  }
  if (value === 'borrowed' || value === 'with_me') {
    return 'Borrowed';
  }
  return String(status);
}
