import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../models/reservation.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { Member } from '../models/member.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(): Promise<Reservation[]> {
    return this.reservationRepository.find({ relations: ['member', 'book'] });
  }

  async findOne(id: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({ 
      where: { id }, 
      relations: ['member', 'book']
    });
    
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID "${id}" not found`);
    }
    
    return reservation;
  }

  async create(createReservationDto: CreateReservationDto, member: Member): Promise<Reservation> {
    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      member,
      status: 'reserved',
    });
    const savedReservation = await this.reservationRepository.save(reservation);
    await this.notificationsService.sendMail(
      member.email,
      'Book Reserved',
      `You have successfully reserved the book "${savedReservation.book.title}".`,
    );
    return savedReservation;
  }

  async cancel(id: number): Promise<Reservation> {
    const reservation = await this.findOne(id);
    reservation.status = 'cancelled';
    return this.reservationRepository.save(reservation);
  }
}
