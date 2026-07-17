import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import {
  BACKUP_TABLES,
  BackupData,
  BackupManifest,
  BackupSource,
  LegacyUser,
} from './backup-types';

const EMPTY_DATA = (): BackupData => ({
  users: [],
  books: [],
  groups: [],
  group_members: [],
  transactions: [],
  reservations: [],
  ratings: [],
  reviews: [],
  notifications: [],
  book_requests: [],
  subscriptions: [],
});

function countRows(data: BackupData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    counts[table] = (data[table as keyof BackupData] as unknown[]).length;
  }
  return counts;
}

function normalizeIsDemo(value: unknown): boolean | number | null {
  if (value == null) {
    return false;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  return Boolean(value);
}

function normalizeUser(row: Record<string, unknown>): LegacyUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? row.email),
    role: String(row.role ?? 'member'),
    phone: row.phone != null ? String(row.phone) : null,
    dateOfBirth: (row.dateOfBirth ?? row.date_of_birth) != null
      ? String(row.dateOfBirth ?? row.date_of_birth)
      : null,
    address: row.address != null ? String(row.address) : null,
    preferences: row.preferences != null ? String(row.preferences) : null,
    is_demo: normalizeIsDemo(row.is_demo ?? row.isDemo),
    createdAt: (row.createdAt ?? row.created_at) != null
      ? String(row.createdAt ?? row.created_at)
      : null,
    updatedAt: (row.updatedAt ?? row.updated_at) != null
      ? String(row.updatedAt ?? row.updated_at)
      : null,
  };
}

function readSqliteTable(db: Database.Database, table: string): Record<string, unknown>[] {
  try {
    return db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export function exportFromSqlite(sqlitePath: string): BackupManifest {
  const db = new Database(sqlitePath, { readonly: true });
  const data = EMPTY_DATA();

  data.users = readSqliteTable(db, 'users').map(normalizeUser);
  data.books = readSqliteTable(db, 'books');
  data.groups = readSqliteTable(db, 'groups');
  data.group_members = readSqliteTable(db, 'group_members');
  data.transactions = readSqliteTable(db, 'transactions');
  data.reservations = readSqliteTable(db, 'reservations');
  data.ratings = readSqliteTable(db, 'ratings');
  data.reviews = readSqliteTable(db, 'reviews');
  data.notifications = readSqliteTable(db, 'notifications');
  data.book_requests = readSqliteTable(db, 'book_requests');
  data.subscriptions = readSqliteTable(db, 'subscriptions');

  db.close();

  return {
    version: '1.0',
    source: 'sqlite',
    exportedAt: new Date().toISOString(),
    counts: countRows(data),
    data,
  };
}

export async function exportFromSupabase(): Promise<BackupManifest> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
  }

  const supabase = createClient(url, key);
  const data = EMPTY_DATA();

  for (const table of BACKUP_TABLES) {
    const { data: rows, error } = await supabase.from(table).select('*');
    if (error && !error.message.includes('does not exist')) {
      console.warn(`⚠️  Supabase table ${table}: ${error.message}`);
    }
    const list = rows ?? [];
    if (table === 'users') {
      data.users = list.map((row) => normalizeUser(row as Record<string, unknown>));
    } else {
      (data[table as keyof BackupData] as Record<string, unknown>[]) = list as Record<string, unknown>[];
    }
  }

  return {
    version: '1.0',
    source: 'supabase',
    exportedAt: new Date().toISOString(),
    counts: countRows(data),
    data,
  };
}

export function loadBackupFile(filePath: string): BackupManifest {
  const raw = fs.readFileSync(filePath, 'utf8');
  const manifest = JSON.parse(raw) as BackupManifest;
  if (manifest.version !== '1.0' || !manifest.data) {
    throw new Error(`Invalid backup format: ${filePath}`);
  }
  manifest.counts = manifest.counts ?? countRows(manifest.data);
  return manifest;
}

export function findLatestBackup(dir: string, source: BackupSource): string | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const prefix = source === 'sqlite' ? 'sqlite-backup-' : 'supabase-backup-';
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(dir, files[0]) : null;
}

export function isDemoUser(user: LegacyUser): boolean {
  if (user.is_demo === true || user.is_demo === 1) {
    return true;
  }
  return user.email.toLowerCase().startsWith('demo_');
}
