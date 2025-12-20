import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'book-id-123', description: 'ID of the book being reviewed' })
  @IsNotEmpty()
  @IsString()
  bookId: string;

  @ApiProperty({ example: 'Great book! Highly recommended.', description: 'Review text content' })
  @IsNotEmpty()
  @IsString()
  review: string;

  @ApiProperty({ example: 5, description: 'Rating value (1-5)', required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiProperty({ example: 'transaction-id-123', description: 'ID of the completed transaction (optional)', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

