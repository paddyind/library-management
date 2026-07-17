import { ConfigService } from '@nestjs/config';

export type IamProviderMode = 'legacy' | 'keycloak';

export function getIamProvider(configService: ConfigService): IamProviderMode {
  const mode = (configService.get<string>('IAM_PROVIDER', 'legacy') || 'legacy').toLowerCase();
  return mode === 'keycloak' ? 'keycloak' : 'legacy';
}
