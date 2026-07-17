import { ConfigService } from '@nestjs/config';

export type DataStorageMode = 'legacy' | 'firebase';

export function getDataStorage(configService: ConfigService): DataStorageMode {
  const mode = (configService.get<string>('DATA_STORAGE', 'legacy') || 'legacy').toLowerCase();
  return mode === 'firebase' ? 'firebase' : 'legacy';
}
