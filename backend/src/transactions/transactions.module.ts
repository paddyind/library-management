import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsFirestoreService } from './transactions-firestore.service';
import { SupabaseModule } from '../config/supabase.module';
import { SqliteModule } from '../config/sqlite.module';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [SupabaseModule, SqliteModule, AuthModule, MembersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsFirestoreService],
})
export class TransactionsModule {}
