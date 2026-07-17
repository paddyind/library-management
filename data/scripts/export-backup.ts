#!/usr/bin/env ts-node
/**
 * Export SQLite or Supabase data to JSON backup files.
 *
 * Usage:
 *   npm run db:backup
 *   ts-node data/scripts/export-backup.ts --source sqlite
 *   ts-node data/scripts/export-backup.ts --source supabase
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportFromSqlite, exportFromSupabase } from './lib/load-backup';
import { BackupSource } from './lib/backup-types';

function parseArgs(): { source: BackupSource; outDir: string } {
  const args = process.argv.slice(2);
  let source: BackupSource = (process.env.BACKUP_SOURCE as BackupSource) || 'sqlite';
  let outDir = process.env.BACKUP_DIR || 'backend/backups';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      source = args[i + 1] as BackupSource;
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outDir = args[i + 1];
      i++;
    }
  }

  return { source, outDir };
}

async function main(): Promise<void> {
  const { source, outDir } = parseArgs();
  const sqlitePath = process.env.SQLITE_PATH || 'data/library.sqlite';
  const targetDir = path.join(outDir, source);

  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`📦 Exporting ${source} backup...`);

  const manifest = source === 'supabase'
    ? await exportFromSupabase()
    : exportFromSqlite(sqlitePath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${source}-backup-${timestamp}.json`;
  const filePath = path.join(targetDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));

  console.log(`✅ Backup written: ${filePath}`);
  console.log('📊 Counts:', manifest.counts);
}

main().catch((error) => {
  console.error('❌ Backup export failed:', error.message);
  process.exit(1);
});
