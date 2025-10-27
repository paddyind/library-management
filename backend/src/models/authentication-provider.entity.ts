import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
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

  @ManyToOne(() => Member, member => member.authenticationProviders)
  member: Member;

  @Column({
    type: 'simple-enum',
    enum: ProviderType,
  })
  provider: ProviderType;

  @Column()
  providerId: string;
}
