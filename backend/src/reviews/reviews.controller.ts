import { Controller, Get, Post, Query } from '@nestjs/common';
import { ReviewsService, GoogleReviewsResponse } from './reviews.service';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async getReviews(@Query('refresh') refresh?: string): Promise<GoogleReviewsResponse> {
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.reviewsService.getReviews(forceRefresh);
  }

  @Post('refresh')
  async refreshReviews(): Promise<GoogleReviewsResponse> {
    return this.reviewsService.getReviews(true);
  }
}
