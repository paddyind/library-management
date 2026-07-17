import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getDataStorage } from './data-storage.util';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private db: admin.firestore.Firestore | null = null;
  private initialized = false;
  private initError: string | null = null;
  private prefix = 'library';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (getDataStorage(this.configService) !== 'firebase') {
      return;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    this.prefix = this.configService.get<string>('APP_FIRESTORE_PREFIX', 'library') || 'library';

    if (!projectId) {
      this.initError = 'FIREBASE_PROJECT_ID is not set';
      console.warn(`⚠️  Firestore: ${this.initError}`);
      return;
    }

    try {
      if (!admin.apps.length) {
        if (credentialsPath) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
          });
        } else {
          admin.initializeApp({ projectId });
        }
      }

      this.db = admin.firestore();
      this.initialized = true;
      console.log(`✅ Firestore ready (project=${projectId}, prefix=${this.prefix})`);
    } catch (error: any) {
      this.initError = error.message;
      console.error(`❌ Firestore init failed: ${error.message}`);
    }
  }

  isReady(): boolean {
    return this.initialized && this.db !== null;
  }

  getInitError(): string | null {
    return this.initError;
  }

  getProjectId(): string | undefined {
    return this.configService.get<string>('FIREBASE_PROJECT_ID');
  }

  getPrefix(): string {
    return this.prefix;
  }

  collectionName(shortName: string): string {
    return `${this.prefix}__${shortName}`;
  }

  collection(shortName: string): admin.firestore.CollectionReference {
    this.assertReady();
    return this.db!.collection(this.collectionName(shortName));
  }

  async ping(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.collection('books').limit(1).get();
      return true;
    } catch {
      return false;
    }
  }

  docToData<T>(doc: admin.firestore.DocumentSnapshot): T & { id: string } {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      ...this.normalizeTimestamps(data),
    } as T & { id: string };
  }

  private normalizeTimestamps(data: admin.firestore.DocumentData): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof admin.firestore.Timestamp) {
        result[key] = value.toDate();
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private assertReady(): void {
    if (!this.isReady()) {
      throw new Error(this.initError ?? 'Firestore is not initialized');
    }
  }
}
