import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { MembersModule } from '../members/members.module';
import { SupabaseModule } from '../config/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MembersModule, SupabaseModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
