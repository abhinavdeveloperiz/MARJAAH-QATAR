import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoreLocationsService, StoreLocationDto } from './store-locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/store-locations')
export class StoreLocationsController {
  constructor(private readonly storeLocationsService: StoreLocationsService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const showAll = String(includeInactive).toLowerCase() === 'true';
    return this.storeLocationsService.findAll(showAll);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.storeLocationsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('store_locations', 'create')
  @Post()
  async create(@Body() body: StoreLocationDto, @Request() req: any) {
    return this.storeLocationsService.create(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('store_locations', 'edit')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<StoreLocationDto>, @Request() req: any) {
    return this.storeLocationsService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('store_locations', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.storeLocationsService.remove(id, req.user);
  }
}

