import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { Reservation } from './reservation.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class ReservationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Reservation[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*, member:members(*), book:books(*)');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findOne(id: number): Promise<Reservation> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*, member:members(*), book:books(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    return data;
  }

  async create(createReservationDto: CreateReservationDto, member: Member): Promise<Reservation> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .insert([
        {
          ...createReservationDto,
          member_id: member.id,
          status: 'reserved',
        },
      ])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async cancel(id: number): Promise<Reservation> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }

    return data;
  }
}
