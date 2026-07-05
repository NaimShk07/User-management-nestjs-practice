import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// @Controller('users') means all routes in this class start with /users
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── POST /users ─────────────────────────────────────────────────────────────
  // Public — no token needed (this is for creating a user, similar to signup)
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  // ── GET /users ───────────────────────────────────────────────────────────────
  // Admin only — only users with role 'admin' can list all users
  // @UseGuards(JwtAuthGuard, RolesGuard) runs two guards in order:
  //   1. JwtAuthGuard: checks the Bearer token is valid, sets req.user
  //   2. RolesGuard: checks req.user.role matches @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // ── GET /users/:id ───────────────────────────────────────────────────────────
  // Protected — any logged-in user can view a user profile
  // ParseIntPipe converts the URL param string "5" → number 5
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // ── PATCH /users/:id ─────────────────────────────────────────────────────────
  // Protected — any logged-in user can update (add role check here if needed)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  // ── PATCH /users/:id/refresh-token ───────────────────────────────────────────
  // Protected — used internally to update the refresh token stored in the DB
  @UseGuards(JwtAuthGuard)
  @Patch(':id/refresh-token')
  updateRefreshToken(
    @Param('id', ParseIntPipe) id: number,
    @Body('refreshToken') refreshToken: string | null,
  ) {
    return this.usersService.updateRefreshToken(id, refreshToken);
  }

  // ── DELETE /users/:id ────────────────────────────────────────────────────────
  // Admin only — only admins can delete users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
