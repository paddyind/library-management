import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class AddMemberDto {
  @IsUUID()
  memberId: string;
}

export class RemoveMemberDto {
  @IsUUID()
  memberId: string;
}
