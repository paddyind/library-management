import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book } from '../books/book.interface';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { Request } from 'express';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all books', description: 'Retrieve all books with optional search filter (public access)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search books by title, author, or ISBN' })
  @ApiResponse({ status: 200, description: 'List of books retrieved successfully' })
  findAll(@Query('search') search?: string): Promise<Book[]> {
    return this.booksService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get book by ID', description: 'Retrieve a single book by its ID (public access)' })
  @ApiResponse({ status: 200, description: 'Book found' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  findOne(@Param('id') id: string): Promise<Book> {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new book', description: 'Add a new book to the catalog (requires authentication)' })
  @ApiBody({ type: CreateBookDto })
  @ApiResponse({ status: 201, description: 'Book created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createBookDto: CreateBookDto, @Req() req: Request): Promise<Book> {
    const userId = (req as any).user.id;
    return this.booksService.create(createBookDto, userId);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update book', description: 'Update book details (requires authentication)' })
  @ApiBody({ type: UpdateBookDto })
  @ApiResponse({ status: 200, description: 'Book updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto): Promise<Book> {
    return this.booksService.update(id, updateBookDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete book', description: 'Remove a book from the catalog (requires authentication)' })
  @ApiResponse({ status: 200, description: 'Book deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.booksService.remove(id);
    return { message: 'Book deleted successfully' };
  }
}
