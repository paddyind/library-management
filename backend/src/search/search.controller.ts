import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole, Member } from '../members/member.interface';
import type { Request } from 'express';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  search(@Req() req: Request, @Query('q') query: string, @Query('type') type: string) {
    const member = req.user as Member;
    if (type === 'members' && member.role !== MemberRole.ADMIN) {
      return [];
    }
    return this.searchService.search(query, type);
  }
}
