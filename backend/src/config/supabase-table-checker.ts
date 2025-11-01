/**
 * Utility to check and create Supabase tables if missing
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface TableCheckResult {
  tableName: string;
  exists: boolean;
  error?: string;
}

export async function checkSupabaseTables(supabase: SupabaseClient): Promise<TableCheckResult[]> {
  const tables = ['books', 'users', 'groups', 'group_members', 'transactions', 'reservations'];
  const results: TableCheckResult[] = [];

  for (const tableName of tables) {
    try {
      // Try a simple SELECT query to check if table exists
      const { error } = await supabase.from(tableName).select('*').limit(0);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          results.push({ tableName, exists: false, error: error.message });
        } else {
          // Table exists but might have other issues
          results.push({ tableName, exists: true, error: error.message });
        }
      } else {
        results.push({ tableName, exists: true });
      }
    } catch (err: any) {
      results.push({ tableName, exists: false, error: err.message });
    }
  }

  return results;
}

export async function logSupabaseTableStatus(supabase: SupabaseClient) {
  console.log('\n📊 Checking Supabase tables...');
  const results = await checkSupabaseTables(supabase);
  
  const missing = results.filter(r => !r.exists);
  const existing = results.filter(r => r.exists);
  
  if (existing.length > 0) {
    console.log('✅ Existing tables:', existing.map(r => r.tableName).join(', '));
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing tables:', missing.map(r => r.tableName).join(', '));
    console.log('💡 Run seed script to create missing tables:');
    console.log('   docker compose exec backend npm run seed');
  } else {
    console.log('✅ All required tables exist in Supabase');
  }
  
  console.log('');
  return results;
}

