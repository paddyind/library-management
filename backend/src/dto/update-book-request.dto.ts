import { IsEnum } from 'class-validator';
import { BookRequestStatus } from '../models/book-request.entity';

export class UpdateBookRequestDto {
  @IsEnum(BookRequestStatus)
  status: BookRequestStatus;
}
