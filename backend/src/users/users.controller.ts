import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminGuard)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const isOwner = req.user.id === id || req.user.sub === id;
    const isAdmin = req.user.is_staff || req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const isOwner = req.user.id === id || req.user.sub === id;
    const isAdmin = req.user.is_staff || req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.update(id, body, req.user);
  }

  @Get(':id/addresses')
  async getAddresses(@Param('id') id: string, @Request() req: any) {
    const isOwner = req.user.id === id || req.user.sub === id;
    const isAdmin = req.user.is_staff || req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.getAddresses(id);
  }

  @Post(':id/addresses')
  async addAddress(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const isOwner = req.user.id === id || req.user.sub === id;
    if (!isOwner) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.addAddress(id, body);
  }

  @Delete(':id/addresses/:addressId')
  async deleteAddress(@Param('id') id: string, @Param('addressId') addressId: string, @Request() req: any) {
    const isOwner = req.user.id === id || req.user.sub === id;
    if (!isOwner) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.deleteAddress(id, addressId);
  }
}
