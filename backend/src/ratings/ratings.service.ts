import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateRatingDto } from '../dto/rating.dto';
import { Rating } from './rating.interface';

@Injectable()
export class RatingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createRatingDto: CreateRatingDto, memberId: string): Promise<Rating> {
    const { bookId, rating } = createRatingDto;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('ratings')
      .insert([{ bookId, memberId, rating }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAverageForBook(bookId: string): Promise<number> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('ratings')
      .select('rating')
      .eq('bookId', bookId);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const sum = data.reduce((acc, { rating }) => acc + rating, 0);
    return sum / data.length;
  }
}
