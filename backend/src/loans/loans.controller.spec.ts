import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { BooksService } from '../books/books.service';
import { SupabaseService } from '../config/supabase.service';
import { CreateLoanDto } from '../dto/loan.dto';
import { Book } from '../books/book.interface';
import { Member } from '../members/member.interface';

describe('LoansController', () => {
  let controller: LoansController;
  let loansService: LoansService;
  let booksService: BooksService;

  const mockLoansService = {
    create: jest.fn(),
  };

  const mockBooksService = {
    findOne: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-id-placeholder' } } }),
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        { provide: LoansService, useValue: mockLoansService },
        { provide: BooksService, useValue: mockBooksService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    controller = module.get<LoansController>(LoansController);
    loansService = module.get<LoansService>(LoansService);
    booksService = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a loan', async () => {
      const createLoanDto: CreateLoanDto = {
        bookId: '1',
        borrowerId: 'user-id-placeholder',
        issueDate: new Date(),
        dueDate: new Date(),
      };
      const book = {} as Book;
      const member = { id: 'user-id-placeholder' } as Member;

      mockBooksService.findOne.mockResolvedValue(book);
      mockLoansService.create.mockResolvedValue({ ...createLoanDto, book, borrower: member });

      const req = { user: { id: 'user-id-placeholder' } };
      const result = await controller.create(createLoanDto, req);

      expect(booksService.findOne).toHaveBeenCalledWith(createLoanDto.bookId);
      expect(loansService.create).toHaveBeenCalledWith(createLoanDto, { id: 'user-id-placeholder' }, book);
      expect(result).toEqual({ ...createLoanDto, book, borrower: member });
    });
  });
});
