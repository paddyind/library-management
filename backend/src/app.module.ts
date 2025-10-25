import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { GroupsModule } from './groups/groups.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BooksModule,
    GroupsModule,
    ReservationsModule,
    ProfileModule,
    NotificationsModule,
  ],
})
export class AppModule {}
