import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'f3e9b8d9-6b3c-4b5a-8e0a-7b0d1f3e9b8d' })
  @IsUUID()
  bookId: string;
}
