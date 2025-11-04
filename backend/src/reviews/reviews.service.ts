import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateReviewDto } from '../dto/review.dto';
import { Review } from './review.interface';

@Injectable()
export class ReviewsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createReviewDto: CreateReviewDto, memberId: string): Promise<Review> {
    const { bookId, review } = createReviewDto;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reviews')
      .insert([{ bookId, memberId, review }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAllForBook(bookId: string): Promise<Review[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reviews')
      .select('*')
      .eq('bookId', bookId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
