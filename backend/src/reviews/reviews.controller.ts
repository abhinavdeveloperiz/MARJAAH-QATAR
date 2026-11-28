import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReviewsService, GoogleReviewsResponse } from './reviews.service';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async getReviews(@Query('refresh') _refresh?: string): Promise<GoogleReviewsResponse> {
    // Forced refresh is staff-only (POST /refresh); public reads always use the cache.
    return this.reviewsService.getReviews(false);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('refresh')
  async refreshReviews(): Promise<GoogleReviewsResponse> {
    return this.reviewsService.getReviews(true);
  }
}
