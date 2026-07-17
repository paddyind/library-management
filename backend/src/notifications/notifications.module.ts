import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { SqliteModule } from '../config/sqlite.module';

@Module({
  imports: [SqliteModule, AuthModule, MembersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
