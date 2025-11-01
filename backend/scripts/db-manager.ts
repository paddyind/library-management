#!/usr/bin/env node
/**
 * Database Manager - Complete Database Management Tool
 * 
 * Features:
 * - Migrate databases
 * - Backup/restore data
 * - Seed database
 * - Full reset (scrap and recreate)
 * - Status checking
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🗄️  Database Manager - Complete Database Management

Usage: npm run db:<command>

Commands:
  init        - Smart setup: Migrate + restore from backup OR seed (auto-detect storage)
  setup       - Run migrations + seed (fresh setup)
  reset       - Backup → Migrate → Restore (scrap and recreate)
  migrate     - Run database migrations only
  seed        - Seed database with demo data
  backup      - Create data backup snapshot
  restore     - Restore from backup snapshot
  status      - Check database and migration status

Examples:
  npm run db:init               # Smart setup (migrate + backup/seed)
  npm run db:setup              # Fresh database setup
  npm run db:reset              # Full reset with backup
  npm run db:backup             # Create backup
  npm run db:restore <file>     # Restore from backup
`);
}

async function runCommand(cmd: string, ...args: string[]) {
  try {
    execSync(`${cmd} ${args.join(' ')}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (error: any) {
    console.error(`❌ Command failed: ${cmd}`);
    process.exit(1);
  }
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  console.log('🗄️  Database Manager\n');

  switch (command) {
    case 'init':
      {
        console.log('🚀 Smart database initialization...\n');
        const storagePreference = (process.env.AUTH_STORAGE || 'auto').toLowerCase();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Determine storage type
        let storage: 'supabase' | 'sqlite';
        if (storagePreference === 'sqlite') {
          storage = 'sqlite';
        } else if (storagePreference === 'supabase' && supabaseUrl && supabaseServiceRoleKey) {
          storage = 'supabase';
        } else if (storagePreference === 'auto' && supabaseUrl && supabaseServiceRoleKey) {
          storage = 'supabase';
        } else {
          storage = 'sqlite';
        }
        
        console.log(`📊 Storage: ${storage.toUpperCase()}\n`);
        
        // Step 1: Run migrations
        console.log('1️⃣ Running migrations...');
        await runCommand('npm', 'run', 'migrate');
        
        // Step 2: Check for backup
        const backupsDir = path.join(__dirname, '..', 'backups', storage);
        let backupFile: string | null = null;
        
        if (fs.existsSync(backupsDir)) {
          const backups = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();
          
          if (backups.length > 0) {
            backupFile = path.join(backupsDir, backups[0]);
            console.log(`\n2️⃣ Found backup: ${backups[0]}`);
            console.log('   Restoring from backup...');
            await runCommand('npm', 'run', 'backup:restore', backupFile, '--confirm');
            console.log('\n✅ Database initialized from backup!');
          } else {
            console.log('\n2️⃣ No backup found');
            console.log('   Seeding with demo data...');
            await runCommand('npm', 'run', 'seed');
            console.log('\n✅ Database initialized with demo data!');
          }
        } else {
          console.log('\n2️⃣ No backup directory found');
          console.log('   Seeding with demo data...');
          await runCommand('npm', 'run', 'seed');
          console.log('\n✅ Database initialized with demo data!');
        }
      }
      break;

    case 'setup':
      console.log('📦 Setting up database (migrate + seed)...\n');
      await runCommand('npm', 'run', 'migrate');
      await runCommand('npm', 'run', 'seed');
      console.log('\n✅ Database setup completed!');
      break;

    case 'reset':
      {
        console.log('🔄 Resetting database (backup → migrate → restore)...\n');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const storagePreference = (process.env.AUTH_STORAGE || 'auto').toLowerCase();
        const storage = storagePreference === 'sqlite' ? 'sqlite' : 'supabase';
        
        console.log('1️⃣ Creating backup...');
        await runCommand('npm', 'run', 'backup:create');
        
        console.log('\n2️⃣ Running migrations...');
        await runCommand('npm', 'run', 'migrate');
        
        console.log('\n3️⃣ Restoring from backup...');
        // Find latest backup
        const resetBackupsDir = path.join(__dirname, '..', 'backups', storage);
        if (fs.existsSync(resetBackupsDir)) {
          const backups = fs.readdirSync(resetBackupsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();
          if (backups.length > 0) {
            const latestBackup = path.join(resetBackupsDir, backups[0]);
            await runCommand('npm', 'run', 'backup:restore', latestBackup, '--confirm');
          }
        }
        
        console.log('\n✅ Database reset completed!');
      }
      break;

    case 'migrate':
      await runCommand('npm', 'run', 'migrate');
      break;

    case 'seed':
      await runCommand('npm', 'run', 'seed');
      break;

    case 'backup':
      await runCommand('npm', 'run', 'backup:create');
      break;

    case 'restore':
      {
        const restoreBackupFile = args[1];
        if (!restoreBackupFile) {
          console.error('❌ Please specify backup file');
          console.log('Usage: npm run db:restore <backup-file>');
          process.exit(1);
        }
        await runCommand('npm', 'run', 'backup:restore', restoreBackupFile, '--confirm');
      }
      break;

    case 'status':
      {
        console.log('📊 Database Status\n');
        console.log('Environment:');
        console.log(`  AUTH_STORAGE: ${process.env.AUTH_STORAGE || 'auto'}`);
        console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
        console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}`);
        console.log(`  SQLITE_PATH: ${process.env.SQLITE_PATH || 'data/library.sqlite'}`);
        
        // Check migration files
        const supabaseMigrations = path.join(__dirname, '..', 'migrations', 'supabase');
        const sqliteMigrations = path.join(__dirname, '..', 'migrations', 'sqlite');
        
        console.log('\nMigrations:');
        if (fs.existsSync(supabaseMigrations)) {
          const files = fs.readdirSync(supabaseMigrations).filter(f => f.endsWith('.sql'));
          console.log(`  Supabase: ${files.length} migration(s)`);
        }
        if (fs.existsSync(sqliteMigrations)) {
          const files = fs.readdirSync(sqliteMigrations).filter(f => f.endsWith('.sql'));
          console.log(`  SQLite: ${files.length} migration(s)`);
        }
        
        // Check backups
        const statusBackupsDir = path.join(__dirname, '..', 'backups');
        if (fs.existsSync(statusBackupsDir)) {
          const supabaseBackups = fs.existsSync(path.join(statusBackupsDir, 'supabase')) 
            ? fs.readdirSync(path.join(statusBackupsDir, 'supabase')).filter(f => f.endsWith('.json')).length 
            : 0;
          const sqliteBackups = fs.existsSync(path.join(statusBackupsDir, 'sqlite'))
            ? fs.readdirSync(path.join(statusBackupsDir, 'sqlite')).filter(f => f.endsWith('.json')).length
            : 0;
          console.log('\nBackups:');
          console.log(`  Supabase: ${supabaseBackups} backup(s)`);
          console.log(`  SQLite: ${sqliteBackups} backup(s)`);
        }
      }
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();

