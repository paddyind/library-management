export type BackupSource = 'sqlite' | 'supabase';

export interface BackupManifest {
  version: '1.0';
  source: BackupSource;
  exportedAt: string;
  counts: Record<string, number>;
  data: BackupData;
}

export interface BackupData {
  users: LegacyUser[];
  books: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  group_members: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  reservations: Record<string, unknown>[];
  ratings: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  book_requests: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
}

export interface LegacyUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  preferences?: string | null;
  is_demo?: boolean | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface IdMap {
  [legacyUserId: string]: string;
}

export interface MigrationReport {
  startedAt: string;
  completedAt: string;
  dryRun: boolean;
  backupSource: BackupSource;
  backupFile?: string;
  manifest: Record<string, number>;
  keycloak: {
    created: number;
    existing: number;
    skippedDemo: number;
    errors: string[];
  };
  firestore: {
    upserted: Record<string, number>;
    skipped: Record<string, number>;
    errors: string[];
  };
  idMap: IdMap;
  warnings: string[];
}

export const BACKUP_TABLES = [
  'users',
  'books',
  'groups',
  'group_members',
  'transactions',
  'reservations',
  'ratings',
  'reviews',
  'notifications',
  'book_requests',
  'subscriptions',
] as const;
