import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Member } from './member.entity';

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

@Entity('authentication_providers')
export class AuthenticationProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: ProviderType,
  })
  provider: ProviderType;

  @Column()
  providerId: string;

  @ManyToOne(() => Member, member => member.authenticationProviders)
  member: Member;
}
