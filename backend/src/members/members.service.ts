import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member, MemberRole } from '../models/member.entity';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createMemberDto: CreateMemberDto, role: MemberRole = MemberRole.MEMBER): Promise<Member> {
    // Check if member with this email already exists
    const existingMember = await this.findByEmail(createMemberDto.email);
    if (existingMember) {
      throw new ConflictException('A member with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createMemberDto.password, 10);
    const member = this.membersRepository.create({
      ...createMemberDto,
      password: hashedPassword,
      role,
    });

    try {
      const savedMember = await this.membersRepository.save(member);
      await this.notificationsService.sendMail(
        savedMember.email,
        'Welcome to the Library Management System',
        `Hi ${savedMember.name}, welcome to the Library Management System!`,
      );
      return savedMember;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('UNIQUE constraint')) {
        throw new ConflictException('A member with this email already exists');
      }
      throw error;
    }
  }

  async findAll(query?: string): Promise<Member[]> {
    if (query) {
      return this.membersRepository
        .createQueryBuilder('member')
        .where('member.name LIKE :query', { query: `%${query}%` })
        .orWhere('member.email LIKE :query', { query: `%${query}%` })
        .getMany();
    }
    return this.membersRepository.find();
  }

  async findOne(id: string): Promise<Member> {
    const member = await this.membersRepository.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
    return member;
  }

  async findByEmail(email: string) {
    return this.membersRepository.findOne({ where: { email } }).then(member => member || undefined);
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOne(id);
    if (updateMemberDto.password) {
      updateMemberDto.password = await bcrypt.hash(updateMemberDto.password, 10);
    }
    const updated = Object.assign(member, updateMemberDto);
    return this.membersRepository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const member = await this.findOne(id);
    await this.membersRepository.remove(member);
  }
}
