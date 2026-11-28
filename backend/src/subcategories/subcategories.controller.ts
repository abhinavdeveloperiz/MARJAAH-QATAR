import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { isStaffRequest } from '../auth/staff-check';
import { SubcategoriesService } from './subcategories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api/subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Get()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('includeInactive') includeInactive?: string,
    @Req() req?: any,
  ) {
    const isInactiveAllowed = String(includeInactive).toLowerCase() === 'true' && isStaffRequest(req);
    return this.subcategoriesService.findAll(categoryId, categorySlug, isInactiveAllowed);
  }

  @Get(':slugOrId')
  async findOne(@Param('slugOrId') slugOrId: string) {
    return this.subcategoriesService.findOne(slugOrId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() body: any) {
    return this.subcategoriesService.create(body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.subcategoriesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('is_active') isActive: boolean) {
    return this.subcategoriesService.update(id, { is_active: Boolean(isActive) });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Query('force') force?: string) {
    const isForce = String(force).toLowerCase() === 'true';
    return this.subcategoriesService.remove(id, isForce);
  }
}
