import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { MembersModule } from '../members/members.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MembersModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
