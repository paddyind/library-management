import { ConfigService } from '@nestjs/config';
import { FirestoreService } from './firestore.service';
import { getDataStorage } from './data-storage.util';

export function usesFirebase(
  configService: ConfigService,
  firestoreService: FirestoreService,
): boolean {
  return getDataStorage(configService) === 'firebase' && firestoreService.isReady();
}

export function getLegacyStorage(_configService: ConfigService): 'sqlite' {
  return 'sqlite';
}
