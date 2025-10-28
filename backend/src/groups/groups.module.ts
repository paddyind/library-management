import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../models/group.entity';
import { Member } from '../models/member.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Member])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
