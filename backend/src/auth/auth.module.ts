import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { KeycloakTokenService } from './keycloak-token.service';
import { AppAuthGuard } from './app-auth.guard';
import { AdminGuard } from './admin.guard';
import { RolesGuard } from './roles.guard';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [SupabaseModule, SqliteModule, forwardRef(() => MembersModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakTokenService,
    JwtAuthGuard,
    KeycloakAuthGuard,
    AppAuthGuard,
    AdminGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, KeycloakAuthGuard, AppAuthGuard, AdminGuard, RolesGuard],
})
export class AuthModule {}
