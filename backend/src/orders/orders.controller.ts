import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Request, Optional } from '@nestjs/common';
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

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    let user = req.user || null;
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
    if (!user && authHeader) {
      try {
        const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
        const payload = this.jwtService.verify(token);
        if (payload?.sub) {
          user = { id: payload.sub, ...payload };
        }
      } catch (e) {}
    }
    return this.ordersService.createOrder(body, user);
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

  @Get(':idOrNumber')
  async findOne(@Param('idOrNumber') idOrNumber: string, @Query('phone') phone: string, @Request() req: any) {
    return this.ordersService.findOne(idOrNumber, req.user, phone);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.cancelOrder(id, req.user);
  }
}
