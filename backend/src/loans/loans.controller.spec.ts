import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { BooksService } from '../books/books.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLoanDto } from '../dto/loan.dto';
import { Member } from '../models/member.entity';
import { Book } from '../models/book.entity';
import { IsNull } from 'typeorm';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        { provide: LoansService, useValue: mockLoansService },
        { provide: BooksService, useValue: mockBooksService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
        borrowerId: '1',
        issueDate: new Date(),
        dueDate: new Date(),
      };
      const req = { user: { id: '1' } };
      const book = new Book();
      const member = new Member();

      mockBooksService.findOne.mockResolvedValue(book);
      mockLoansService.create.mockResolvedValue({ ...createLoanDto, book, borrower: member });

      const result = await controller.create(createLoanDto, req);

      expect(booksService.findOne).toHaveBeenCalledWith(createLoanDto.bookId);
      expect(loansService.create).toHaveBeenCalledWith(createLoanDto, req.user, book);
      expect(result).toEqual({ ...createLoanDto, book, borrower: member });
    });
  });
});
