import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { Book } from '../books/book.interface';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import type { Request } from 'express';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all books', description: 'Retrieve all books with optional search filter (public access)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search books by title, author, or ISBN' })
  @ApiQuery({ name: 'forSale', required: false, description: 'Filter books that are for sale' })
  @ApiResponse({ status: 200, description: 'List of books retrieved successfully' })
  findAll(@Query('search') search?: string, @Query('forSale') forSale?: boolean): Promise<Book[]> {
    // Cache-Control header to prevent unnecessary caching on client side
    // But allow short cache on CDN/proxy (60 seconds)
    // Note: In production, consider implementing Redis cache for better performance
    return this.booksService.findAll(search, forSale);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search books', description: 'Search books by query parameter (public access)' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query for title, author, or ISBN' })
  @ApiResponse({ status: 200, description: 'List of matching books' })
  search(@Query('q') query?: string): Promise<Book[]> {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get book by ID', description: 'Retrieve a single book by its ID (public access)' })
  @ApiResponse({ status: 200, description: 'Book found' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  findOne(@Param('id') id: string): Promise<Book> {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, AdminGuard)
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
  @UseGuards(SupabaseAuthGuard, AdminGuard)
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
  @UseGuards(SupabaseAuthGuard, AdminGuard)
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
