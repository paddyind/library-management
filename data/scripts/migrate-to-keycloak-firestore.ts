#!/usr/bin/env ts-node
/**
 * Migrate library JSON backup → Keycloak (realm library) + Firestore (library__*).
 *
 * Usage:
 *   npm run migrate:keycloak-firestore -- --dry-run
 *   npm run migrate:keycloak-firestore
 *   npm run migrate:keycloak-firestore -- --backup backend/backups/sqlite/sqlite-backup-*.json
 *   npm run migrate:keycloak-firestore -- --source sqlite --skip-keycloak
 *
 * Env:
 *   KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD
 *   FIREBASE_PROJECT_ID, APP_FIRESTORE_PREFIX, GOOGLE_APPLICATION_CREDENTIALS
 *   SQLITE_PATH (when --source sqlite)
 */

import * as fs from 'fs';
import * as path from 'path';
import { MigrationReport } from './lib/backup-types';
import {
  exportFromSqlite,
  findLatestBackup,
  isDemoUser,
  loadBackupFile,
} from './lib/load-backup';
import { KeycloakMigrator } from './lib/keycloak-migrator';
import { FirestoreMigrator } from './lib/firestore-migrator';

interface CliOptions {
  dryRun: boolean;
  skipKeycloak: boolean;
  skipFirestore: boolean;
  source: 'auto' | 'sqlite' | 'supabase' | 'backup';
  backupPath?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: args.includes('--dry-run'),
    skipKeycloak: args.includes('--skip-keycloak'),
    skipFirestore: args.includes('--skip-firestore'),
    source: 'auto',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      options.source = args[i + 1] as CliOptions['source'];
      i++;
    } else if (args[i] === '--backup' && args[i + 1]) {
      options.backupPath = args[i + 1];
      options.source = 'backup';
      i++;
    }
  }

  return options;
}

async function loadManifest(options: CliOptions) {
  if (options.backupPath) {
    return { manifest: loadBackupFile(options.backupPath), backupFile: options.backupPath };
  }

  if (options.source === 'sqlite') {
    const sqlitePath = process.env.SQLITE_PATH || 'data/library.sqlite';
    return { manifest: exportFromSqlite(sqlitePath), backupFile: undefined };
  }

  if (options.source === 'supabase') {
    const { exportFromSupabase } = await import('./lib/load-backup.js');
    return { manifest: await exportFromSupabase(), backupFile: undefined };
  }

  const sqliteBackup = findLatestBackup('backend/backups/sqlite', 'sqlite');
  if (sqliteBackup) {
    return { manifest: loadBackupFile(sqliteBackup), backupFile: sqliteBackup };
  }

  const sqlitePath = process.env.SQLITE_PATH || 'data/library.sqlite';
  if (fs.existsSync(sqlitePath)) {
    console.log('ℹ️  No JSON backup found — reading live SQLite');
    return { manifest: exportFromSqlite(sqlitePath), backupFile: undefined };
  }

  throw new Error('No backup file or SQLite database found. Run: npm run db:backup');
}

function pickFallbackOwnerId(idMap: Record<string, string>, users: { id: string; role: string }[]): string | null {
  const entries = Object.entries(idMap);
  if (entries.length === 0) {
    return null;
  }

  for (const [legacyId, sub] of entries) {
    const user = users.find((u) => u.id === legacyId && u.role === 'admin');
    if (user) {
      return sub;
    }
  }

  return entries[0][1];
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const options = parseArgs();

  console.log(`🚀 Library migration → Keycloak + Firestore${options.dryRun ? ' (DRY RUN)' : ''}`);

  const { manifest, backupFile } = await loadManifest(options);
  console.log(`📂 Source: ${manifest.source}${backupFile ? ` (${backupFile})` : ''}`);
  console.log('📊 Manifest counts:', manifest.counts);

  const warnings: string[] = [];
  const demoLegacyIds = new Set(
    manifest.data.users.filter(isDemoUser).map((u) => u.id),
  );

  if (demoLegacyIds.size > 0) {
    warnings.push(`${demoLegacyIds.size} demo user(s) skipped for Keycloak (recreate via seed if needed)`);
  }

  let idMap: Record<string, string> = {};
  let keycloakResult = { created: 0, existing: 0, skippedDemo: demoLegacyIds.size, errors: [] as string[] };

  if (!options.skipKeycloak) {
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:3510';
    const realm = process.env.KEYCLOAK_REALM || 'library';

    const migrator = new KeycloakMigrator({
      baseUrl: keycloakUrl.replace(/\/$/, ''),
      realm,
      adminUser: process.env.KEYCLOAK_ADMIN || 'admin',
      adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
      dryRun: options.dryRun,
    });

    const usersToMigrate = manifest.data.users.filter((u) => !isDemoUser(u));
    console.log(`👤 Migrating ${usersToMigrate.length} real user(s) to Keycloak realm "${realm}"...`);

    for (const user of usersToMigrate) {
      try {
        const { sub, created } = await migrator.ensureUser(user);
        idMap[user.id] = sub;
        if (created) {
          keycloakResult.created++;
        } else {
          keycloakResult.existing++;
        }
      } catch (error: any) {
        keycloakResult.errors.push(`${user.email}: ${error.message}`);
      }
    }

    keycloakResult.skippedDemo = demoLegacyIds.size;
    console.log(`   Keycloak: ${Object.keys(idMap).length} mapped, errors: ${keycloakResult.errors.length}`);
  } else {
    console.log('⏭️  Skipping Keycloak (--skip-keycloak)');
  }

  const fallbackOwnerId = pickFallbackOwnerId(idMap, manifest.data.users);
  if (fallbackOwnerId && manifest.data.books.some((b) => demoLegacyIds.has(String(b.owner_id)))) {
    warnings.push(`Books owned by demo users reassigned to profile ${fallbackOwnerId}`);
  }

  let firestoreResult = {
    upserted: {} as Record<string, number>,
    skipped: {} as Record<string, number>,
    errors: [] as string[],
  };

  if (!options.skipFirestore) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is required for Firestore migration');
    }

    const prefix = process.env.APP_FIRESTORE_PREFIX || 'library';
    console.log(`🔥 Migrating data to Firestore (${projectId}, prefix=${prefix})...`);

    const firestoreMigrator = new FirestoreMigrator({
      projectId,
      prefix,
      dryRun: options.dryRun,
    });

    firestoreResult = await firestoreMigrator.migrate(
      manifest.data,
      idMap,
      fallbackOwnerId,
      (legacyId) => demoLegacyIds.has(legacyId),
    );

    console.log('   Firestore upserted:', firestoreResult.upserted);
    if (Object.keys(firestoreResult.skipped).length > 0) {
      console.log('   Firestore skipped:', firestoreResult.skipped);
    }
  } else {
    console.log('⏭️  Skipping Firestore (--skip-firestore)');
  }

  const report: MigrationReport = {
    startedAt,
    completedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    backupSource: manifest.source,
    backupFile,
    manifest: manifest.counts,
    keycloak: keycloakResult,
    firestore: firestoreResult,
    idMap,
    warnings,
  };

  const reportDir = path.join('backend', 'backups');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );

  if (!options.dryRun) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report: ${reportPath}`);
  } else {
    console.log('\n📄 Dry run — no report file written');
    console.log(JSON.stringify(report, null, 2));
  }

  const hasErrors = keycloakResult.errors.length + firestoreResult.errors.length > 0;
  if (hasErrors) {
    console.error('\n❌ Migration completed with errors');
    process.exit(1);
  }

  console.log('\n✅ Migration complete');
}

main().catch((error) => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
