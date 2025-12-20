import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReviewsService } from './reviews.service';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let sqliteService: jest.Mocked<SqliteService>;
  let emailService: jest.Mocked<EmailService>;
  let membersService: jest.Mocked<MembersService>;
  let booksService: jest.Mocked<BooksService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: SupabaseService,
          useValue: {
            isReady: jest.fn(),
            getClient: jest.fn(),
          },
        },
        {
          provide: SqliteService,
          useValue: {
            isReady: jest.fn(),
            getDatabase: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendReviewApprovalEmail: jest.fn(),
          },
        },
        {
          provide: MembersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: BooksService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    supabaseService = module.get(SupabaseService);
    sqliteService = module.get(SqliteService);
    emailService = module.get(EmailService);
    membersService = module.get(MembersService);
    booksService = module.get(BooksService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if user has not returned the book', async () => {
      jest.spyOn(service as any, 'hasCompletedReturn').mockResolvedValue(false);

      const createReviewDto = {
        bookId: 'book-1',
        review: 'Great book!',
      };

      await expect(
        service.create(createReviewDto, 'member-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create review with pending status', async () => {
      jest.spyOn(service as any, 'hasCompletedReturn').mockResolvedValue(true);
      
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(null),
          run: jest.fn(),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      const createReviewDto = {
        bookId: 'book-1',
        review: 'Great book!',
        transactionId: 'transaction-1',
      };

      const result = await service.create(createReviewDto, 'member-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.review).toBe('Great book!');
    });
  });

  describe('findAllForBook', () => {
    it('should only return approved reviews', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([
            {
              id: 'review-1',
              bookId: 'book-1',
              memberId: 'member-1',
              review: 'Great!',
              status: 'approved',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      const reviews = await service.findAllForBook('book-1');

      expect(reviews).toHaveLength(1);
      expect(reviews[0].status).toBe('approved');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("status = 'approved'")
      );
    });
  });

  describe('approve', () => {
    it('should approve review and send email', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'review-1',
            bookId: 'book-1',
            memberId: 'member-1',
            review: 'Great book!',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          run: jest.fn(),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      membersService.findOne.mockResolvedValue({
        id: 'member-1',
        email: 'member@example.com',
        name: 'Test Member',
      } as any);

      booksService.findOne.mockResolvedValue({
        id: 'book-1',
        title: 'Test Book',
      } as any);

      const result = await service.approve('review-1', 'admin-1');

      expect(result.status).toBe('approved');
      expect(emailService.sendReviewApprovalEmail).toHaveBeenCalledWith(
        'member@example.com',
        'Test Member',
        'Test Book',
        true
      );
    });
  });

  describe('reject', () => {
    it('should reject review with reason and send email', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'review-1',
            bookId: 'book-1',
            memberId: 'member-1',
            review: 'Great book!',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          run: jest.fn(),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      membersService.findOne.mockResolvedValue({
        id: 'member-1',
        email: 'member@example.com',
        name: 'Test Member',
      } as any);

      booksService.findOne.mockResolvedValue({
        id: 'book-1',
        title: 'Test Book',
      } as any);

      const result = await service.reject('review-1', 'admin-1', 'Inappropriate content');

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Inappropriate content');
      expect(emailService.sendReviewApprovalEmail).toHaveBeenCalledWith(
        'member@example.com',
        'Test Member',
        'Test Book',
        false,
        'Inappropriate content'
      );
    });
  });
});

