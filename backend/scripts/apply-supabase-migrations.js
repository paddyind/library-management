#!/usr/bin/env node
/**
 * Apply Supabase Migrations via SQL
 * 
 * Since Supabase doesn't support direct SQL execution via REST API,
 * this script generates SQL that you can copy-paste into Supabase SQL Editor
 * or provides instructions for applying migrations.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations', 'supabase');

function generateSupabaseSQL() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.error('❌ No migration files found');
    process.exit(1);
  }

  console.log('📋 Supabase Migration SQL\n');
  console.log('='.repeat(60));
  console.log('Copy the SQL below and run it in Supabase SQL Editor:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Paste the SQL below');
  console.log('5. Click "Run"\n');
  console.log('='.repeat(60) + '\n');

  let combinedSQL = '-- =====================================================\n';
  combinedSQL += '-- Library Management System - Supabase Schema\n';
  combinedSQL += '-- Auto-generated from migration files\n';
  combinedSQL += '-- =====================================================\n\n';

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    combinedSQL += `-- Migration: ${file}\n`;
    combinedSQL += '-- ' + '='.repeat(50) + '\n';
    combinedSQL += sql + '\n\n';
  }

  console.log(combinedSQL);
  
  // Also save to file for easy copying
  const outputFile = path.join(__dirname, '..', 'backups', 'supabase-migration-combined.sql');
  const backupsDir = path.dirname(outputFile);
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  fs.writeFileSync(outputFile, combinedSQL);
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ SQL also saved to: ${outputFile}`);
  console.log('='.repeat(60) + '\n');
}

generateSupabaseSQL();

