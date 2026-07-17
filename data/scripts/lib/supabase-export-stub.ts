/**
 * Supabase live export was removed in Phase 6 (v3.0.0).
 * Use existing JSON backups under backend/backups/supabase/ if you still have them.
 */
export async function exportFromSupabase(): Promise<never> {
  throw new Error(
    'Supabase export is no longer supported (Phase 6). Use --source sqlite or an existing backup JSON file.',
  );
}
