import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBookRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsOptional()
  isbn: string;
}
