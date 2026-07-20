import {
  IsString,
  IsOptional,
  IsArray,
  IsISBN,
  IsUUID,
  IsInt,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  forSale?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count?: number;

  /** Accept Title Case or lowercase; service normalizes to BookStatus. */
  @IsOptional()
  @IsString()
  @IsIn(['available', 'Available', 'borrowed', 'Borrowed', 'reserved', 'Reserved', 'new', 'New', 'damaged', 'Damaged', 'lent', 'unavailable'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  forSale?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
}

export class LendBookDto {
  @IsUUID()
  bookId: string;

  @IsUUID()
  borrowerId: string;

  @IsString()
  dueDate: string;
}
