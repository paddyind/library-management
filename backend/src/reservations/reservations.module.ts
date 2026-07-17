import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { SqliteModule } from '../config/sqlite.module';

@Module({
  imports: [SqliteModule, AuthModule, MembersModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
