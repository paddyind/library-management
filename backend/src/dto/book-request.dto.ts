import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBookRequestDto {
  @ApiProperty({ example: 'The Lord of the Rings' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'J.R.R. Tolkien' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: '978-0-618-64015-7' })
  @IsString()
  @IsOptional()
  isbn: string;
}
