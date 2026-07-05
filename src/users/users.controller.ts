import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// @Controller('users') means all routes in this class start with /users
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST /users  → create a new user (public, no login needed)
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  // GET /users  → get all users (protected — needs a JWT token)
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/5  → get one user by id (protected)
  // ParseIntPipe converts the string "5" from the URL into the number 5
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PATCH /users/5  → update a user (protected)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  // PATCH /users/5/refresh-token  → update only the refresh token (protected)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/refresh-token')
  updateRefreshToken(
    @Param('id', ParseIntPipe) id: number,
    @Body('refreshToken') refreshToken: string | null,
  ) {
    return this.usersService.updateRefreshToken(id, refreshToken);
  }

  // DELETE /users/5  → delete a user (protected)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
