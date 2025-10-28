import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { MembersModule } from '../members/members.module';
import { Subscription } from '../models/subscription.entity';

@Module({
  imports: [MembersModule, TypeOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
