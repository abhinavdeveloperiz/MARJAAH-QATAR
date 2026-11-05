import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, PageViewTrackDto } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { RequirePermission } from '../admin/rbac/require-permission.decorator';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  async track(@Body() body: PageViewTrackDto) {
    return this.analyticsService.trackPageView(body);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermission('reports_analytics', 'view')
  @Get('summary')
  async getSummary(@Query('days') days?: string) {
    const numDays = Math.max(1, Math.min(365, Number(days) || 30));
    return this.analyticsService.getTrafficStats(numDays);
  }
}

