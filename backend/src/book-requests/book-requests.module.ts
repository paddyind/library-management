import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookRequest } from '../models/book-request.entity';
import { BookRequestsController } from './book-requests.controller';
import { BookRequestsService } from './book-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookRequest])],
  controllers: [BookRequestsController],
  providers: [BookRequestsService],
})
export class BookRequestsModule {}
