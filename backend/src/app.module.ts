import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { BooksModule } from './books/books.module';
import { GroupsModule } from './groups/groups.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BookRequestsModule } from './book-requests/book-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    MembersModule,
    BooksModule,
    BookRequestsModule,
    GroupsModule,
    ReservationsModule,
    ProfileModule,
    NotificationsModule,
    SubscriptionsModule,
    TransactionsModule,
  ],
})
export class AppModule {}
