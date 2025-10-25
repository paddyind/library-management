import { IsString, IsOptional, IsArray, IsISBN, IsUUID } from 'class-validator';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  status?: 'available' | 'lent' | 'unavailable';
}

export class LendBookDto {
  @IsUUID()
  bookId: string;

  @IsUUID()
  borrowerId: string;

  @IsString()
  dueDate: string;
}
