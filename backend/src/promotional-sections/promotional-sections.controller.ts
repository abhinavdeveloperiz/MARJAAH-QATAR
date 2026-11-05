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
import { PromotionalSectionsService, PromotionalSectionDto } from './promotional-sections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/promotional-sections')
export class PromotionalSectionsController {
  constructor(private readonly promoService: PromotionalSectionsService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const showAll = String(includeInactive).toLowerCase() === 'true';
    return this.promoService.findAll(showAll);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.promoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('website_content', 'create')
  @Post()
  async create(@Body() body: PromotionalSectionDto, @Request() req: any) {
    return this.promoService.create(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('website_content', 'edit')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<PromotionalSectionDto>, @Request() req: any) {
    return this.promoService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('website_content', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.promoService.remove(id, req.user);
  }
}

