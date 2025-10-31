import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { MembersModule } from '../members/members.module';
import { SupabaseModule } from '../config/supabase.module';

@Module({
  imports: [MembersModule, SupabaseModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
