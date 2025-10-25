import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../models/reservation.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { User } from '../models/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(): Promise<Reservation[]> {
    return this.reservationRepository.find({ relations: ['user', 'book'] });
  }

  findOne(id: number): Promise<Reservation> {
    return this.reservationRepository.findOne({ where: { id }, relations: ['user', 'book'] });
  }

  async create(createReservationDto: CreateReservationDto, user: User): Promise<Reservation> {
    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      user,
      status: 'reserved',
    });
    const savedReservation = await this.reservationRepository.save(reservation);
    await this.notificationsService.sendMail(
      user.email,
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
