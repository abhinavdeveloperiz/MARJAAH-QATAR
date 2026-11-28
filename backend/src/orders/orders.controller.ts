import { Controller, Post, Get, Patch, Put, Delete, Param, Body, Query, UseGuards, Request, Optional } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('api/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Verifies an optional Bearer token; returns null for anonymous callers. */
  private optionalUser(req: any) {
    if (req.user) return req.user;
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
    if (!authHeader) return null;
    try {
      const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
      const payload = this.jwtService.verify(token);
      return payload?.sub ? { id: payload.sub, ...payload } : null;
    } catch (e) {
      return null;
    }
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.ordersService.createOrder(body, this.optionalUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    return this.ordersService.findAll(query, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async findUserOrders(@Request() req: any) {
    const res = await this.ordersService.findAll({}, req.user);
    return res.items || res;
  }

  // ─── DYNAMIC POLICIES & NOTIFICATIONS (Placed before :idOrNumber wildcard) ──
  @Get('policies')
  async getPolicies() {
    return this.ordersService.getOrderPolicySettings();
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  async getCustomerNotifications(@Request() req: any) {
    return this.ordersService.getCustomerNotifications(req.user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/returns-and-cancellations')
  async getReturnsAndCancellations(@Query() query: any) {
    return this.ordersService.getReturnsAndCancellations(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/policies')
  async getAdminPolicies() {
    return this.ordersService.getOrderPolicySettings();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('admin/policies')
  async updateAdminPolicies(@Body() body: any, @Request() req: any) {
    return this.ordersService.updateOrderPolicySettings(body, req.user);
  }

  @Get(':idOrNumber')
  async findOne(@Param('idOrNumber') idOrNumber: string, @Query('phone') phone: string, @Request() req: any) {
    return this.ordersService.findOne(idOrNumber, this.optionalUser(req), phone);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateStatus(id, body?.status, body?.notes);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/status')
  async updateStatusPut(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateStatus(id, body?.status, body?.notes);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  async updateOrderPut(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateOrder(id, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async updateOrderPatch(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateOrder(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.ordersService.cancelOrder(id, req.user, body?.reason, body?.notes);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/return')
  async requestReturn(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.ordersService.requestReturn(id, req.user, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/return-review')
  async reviewReturn(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.ordersService.reviewReturnRequest(id, req.user, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('restock') restock: string,
    @Request() req: any,
  ) {
    return this.ordersService.deleteOrder(id, req.user, restock !== 'false');
  }
}
