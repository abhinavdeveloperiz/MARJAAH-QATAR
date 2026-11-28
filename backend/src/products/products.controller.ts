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
  Header,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { isStaffRequest } from '../auth/staff-check';
import { ProductsService, ProductFilterQuery } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  async searchCatalog(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const query = q || search || '';
    const numLimit = Math.max(1, Math.min(100, Number(limit) || 12));
    return this.productsService.searchCatalog(query, numLimit);
  }

  @Get('filters')
  async getCategoryFilters(@Query() query: { category?: string; subcategory?: string; search?: string }) {
    return this.productsService.getCategoryFilters(query);
  }

  @Get(':slugOrId/recommendations')
  async getRecommendations(@Param('slugOrId') slugOrId: string, @Query('limit') limit?: string) {
    const numLimit = Math.max(1, Math.min(24, Number(limit) || 8));
    return this.productsService.getRecommendations(slugOrId, numLimit);
  }

  // Lightweight freshness probe used by the storefront cache.
  @Get('version')
  @Header('Cache-Control', 'no-cache')
  async getVersion() {
    return { version: await this.productsService.getCatalogVersionRemote() };
  }

  // `no-cache` = the browser may keep a copy but must revalidate (Express ETag -> cheap 304 when nothing changed).
  @Get()
  @Header('Cache-Control', 'no-cache')
  async findAll(@Query() query: ProductFilterQuery, @Req() req: any) {
    const result: any = await this.productsService.findAll(query);
    // Public storefront lists never show long descriptions/specs (the product page loads the full
    // record separately), so strip them to keep list responses small. Staff keep the full records.
    if (isStaffRequest(req)) return result;
    const slim = (p: any) => {
      if (!p || typeof p !== 'object') return p;
      const { description, description_ar, specifications, specs, ...rest } = p;
      return rest;
    };
    const items = Array.isArray(result?.items) ? result.items.map(slim) : result?.items;
    return { ...result, items, products: items };
  }

  @Get('featured')
  async getFeatured(@Query() query: ProductFilterQuery) {
    return this.productsService.findAll({ ...query, isFeatured: true });
  }

  @Get('best-sellers')
  async getBestSellers(@Query() query: ProductFilterQuery) {
    return this.productsService.findAll({ ...query, isBestSeller: true, sortBy: 'popular' });
  }

  @Get('new-arrivals')
  async getNewArrivals(@Query() query: ProductFilterQuery) {
    return this.productsService.findAll({ ...query, isNew: true, sortBy: 'newest' });
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
  @RequirePermission('products', 'edit')
  @Patch(':id')
  async patchUpdate(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.productsService.update(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('products', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.productsService.remove(id, req.user);
  }
}
