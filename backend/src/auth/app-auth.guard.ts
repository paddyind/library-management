import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { getIamProvider } from '../config/iam-provider.util';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly keycloakAuthGuard: KeycloakAuthGuard,
  ) {}

  canActivate(context: ExecutionContext) {
    if (getIamProvider(this.configService) === 'keycloak') {
      return this.keycloakAuthGuard.canActivate(context);
    }
    return this.jwtAuthGuard.canActivate(context);
  }
}
