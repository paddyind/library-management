import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [SqliteModule, AuthModule, MembersModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
