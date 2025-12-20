import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RatingsService } from './ratings.service';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { EmailService } from '../config/email.service';
import { MembersService } from '../members/members.service';
import { BooksService } from '../books/books.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RatingsService', () => {
  let service: RatingsService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let sqliteService: jest.Mocked<SqliteService>;
  let emailService: jest.Mocked<EmailService>;
  let membersService: jest.Mocked<MembersService>;
  let booksService: jest.Mocked<BooksService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
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
            sendRatingApprovalEmail: jest.fn(),
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

    service = module.get<RatingsService>(RatingsService);
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
      // Mock hasCompletedReturn to return false
      jest.spyOn(service as any, 'hasCompletedReturn').mockResolvedValue(false);

      const createRatingDto = {
        bookId: 'book-1',
        rating: 5,
      };

      await expect(
        service.create(createRatingDto, 'member-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create rating with pending status', async () => {
      // Mock hasCompletedReturn to return true
      jest.spyOn(service as any, 'hasCompletedReturn').mockResolvedValue(true);
      
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(null), // No existing rating
          run: jest.fn(),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      const createRatingDto = {
        bookId: 'book-1',
        rating: 5,
        transactionId: 'transaction-1',
      };

      const result = await service.create(createRatingDto, 'member-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.rating).toBe(5);
    });
  });

  describe('findAverageForBook', () => {
    it('should only count approved ratings', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([
            { rating: 5 },
            { rating: 4 },
            { rating: 3 },
          ]),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      const average = await service.findAverageForBook('book-1');

      expect(average).toBe(4); // (5 + 4 + 3) / 3
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("status = 'approved'")
      );
    });
  });

  describe('approve', () => {
    it('should approve rating and send email', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'rating-1',
            bookId: 'book-1',
            memberId: 'member-1',
            rating: 5,
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

      const result = await service.approve('rating-1', 'admin-1');

      expect(result.status).toBe('approved');
      expect(emailService.sendRatingApprovalEmail).toHaveBeenCalledWith(
        'member@example.com',
        'Test Member',
        'Test Book',
        true
      );
    });

    it('should throw NotFoundException if rating not found', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(null),
        }),
      };
      sqliteService.getDatabase.mockReturnValue(mockDb as any);

      await expect(
        service.approve('rating-1', 'admin-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject rating with reason and send email', async () => {
      configService.get.mockReturnValue('sqlite');
      sqliteService.isReady.mockReturnValue(true);
      
      const mockDb = {
        prepare: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 'rating-1',
            bookId: 'book-1',
            memberId: 'member-1',
            rating: 5,
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

      const result = await service.reject('rating-1', 'admin-1', 'Inappropriate content');

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Inappropriate content');
      expect(emailService.sendRatingApprovalEmail).toHaveBeenCalledWith(
        'member@example.com',
        'Test Member',
        'Test Book',
        false,
        'Inappropriate content'
      );
    });
  });
});

