import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { UsersController } from './users.controller';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, SqliteModule, forwardRef(() => AuthModule)],
  providers: [MembersService],
  controllers: [MembersController, UsersController],
  exports: [MembersService],
})
export class MembersModule {}
