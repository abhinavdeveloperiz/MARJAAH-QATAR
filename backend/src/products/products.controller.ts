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
import { ProductsService, ProductFilterQuery } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('filters')
  async getCategoryFilters(@Query() query: { category?: string; subcategory?: string; search?: string }) {
    return this.productsService.getCategoryFilters(query);
  }

  @Get(':slugOrId/recommendations')
  async getRecommendations(@Param('slugOrId') slugOrId: string, @Query('limit') limit?: string) {
    const numLimit = Math.max(1, Math.min(24, Number(limit) || 8));
    return this.productsService.getRecommendations(slugOrId, numLimit);
  }

  @Get()
  async findAll(@Query() query: ProductFilterQuery) {
    return this.productsService.findAll(query);
  }

  @Get(':slugOrId')
  async findOne(@Param('slugOrId') slugOrId: string) {
    return this.productsService.findOne(slugOrId);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'create')
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Request() req: any) {
    return this.productsService.duplicate(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'edit')
  @Patch('bulk-status')
  async bulkUpdateStatus(@Body() body: { ids: string[]; status: string }, @Request() req: any) {
    return this.productsService.bulkUpdateStatus(body.ids || [], body.status, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'create')
  @Post('bulk')
  async bulkUpsert(@Body() body: any) {
    const items = Array.isArray(body) ? body : (body.products || []);
    return this.productsService.bulkUpsert(items);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'create')
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.productsService.create(body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'edit')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.productsService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.productsService.remove(id, req.user);
  }
}
