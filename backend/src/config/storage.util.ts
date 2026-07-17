import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { FirestoreService } from './firestore.service';
import { getDataStorage } from './data-storage.util';

export function usesFirebase(
  configService: ConfigService,
  firestoreService: FirestoreService,
): boolean {
  return getDataStorage(configService) === 'firebase' && firestoreService.isReady();
}

export function getLegacyStorage(
  configService: ConfigService,
  supabaseService: SupabaseService,
): 'supabase' | 'sqlite' {
  const storagePreference = configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();

  if (storagePreference === 'sqlite') {
    return 'sqlite';
  }

  if (storagePreference === 'supabase') {
    return 'supabase';
  }

  if (supabaseService.isReady()) {
    return 'supabase';
  }

  return 'sqlite';
}
