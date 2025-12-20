import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ example: 'book-id-123', description: 'ID of the book being rated' })
  @IsNotEmpty()
  @IsString()
  bookId: string;

  @ApiProperty({ example: 5, description: 'Rating value (1-5)', minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'transaction-id-123', description: 'ID of the completed transaction (optional)', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

