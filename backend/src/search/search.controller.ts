import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../models/user.entity';

import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { User } from 'src/models/user.entity';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  search(@Req() req: Request, @Query('q') query: string, @Query('type') type: string) {
    const user = req.user as User;
    if (type === 'members' && user.role !== UserRole.ADMIN) {
      return [];
    }
    return this.searchService.search(query, type);
  }
}
