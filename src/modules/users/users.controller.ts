import { Controller, Get, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';

@Controller('me')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  me(@Req() req: Request) {
    const userId = req.user?.userId;
    return this.userService.findById(userId as string);
  }
}
