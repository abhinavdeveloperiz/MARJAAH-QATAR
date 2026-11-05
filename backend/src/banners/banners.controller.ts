import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async findAll(@Query('type') type?: string, @Query('includeInactive') includeInactive?: string) {
    return this.bannersService.findAll(type, String(includeInactive).toLowerCase() === 'true');
  }

  @Get('version')
  async getVersion(@Query('type') type?: string) {
    return this.bannersService.getVersion(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('banners', 'create')
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.bannersService.create(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('banners', 'edit')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.bannersService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('banners', 'edit')
  @Patch(':id')
  async patchUpdate(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.bannersService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('banners', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.bannersService.remove(id, req.user);
  }
}
