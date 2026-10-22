import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../firebase/firestore.service';

export interface GoogleReviewItem {
  id?: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDescription?: string;
  publishTime?: string;
  authorUrl?: string;
}

export interface GoogleReviewsResponse {
  configured: boolean;
  name: string;
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  writeReviewUri: string;
  reviews: GoogleReviewItem[];
  cachedAt?: string;
  message?: string;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private memoryCache: GoogleReviewsResponse | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours cache to stay well within free tier

  constructor(
    private readonly configService: ConfigService,
    private readonly firestoreService: FirestoreService,
  ) {}

  /**
   * Get Google Reviews for MARJAAH with smart caching (In-Memory -> Firestore -> Live Google API)
   */
  async getReviews(forceRefresh: boolean = false): Promise<GoogleReviewsResponse> {
    const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
    const placeId = this.configService.get<string>('GOOGLE_PLACE_ID');
    const customBusinessUrl = this.configService.get<string>('GOOGLE_BUSINESS_URL');

    // If API credentials are not yet configured in .env
    if (!apiKey || !placeId) {
      this.logger.warn('GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID is not configured in .env');
      return {
        configured: false,
        name: 'MARJAAH Qatar (M.SHOP)',
        rating: 5.0,
        userRatingCount: 0,
        googleMapsUri: customBusinessUrl || 'https://maps.google.com',
        writeReviewUri: customBusinessUrl ? `${customBusinessUrl}#reviews` : 'https://maps.google.com',
        reviews: [],
        message: 'Google Place ID or Google Places API Key is missing. Please add GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID in backend/.env',
      };
    }

    const now = Date.now();

    // 1. Check in-memory cache if not forcing refresh
    if (!forceRefresh && this.memoryCache && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.memoryCache;
    }

    // 2. Check Firestore cache if not forcing refresh
    if (!forceRefresh) {
      try {
        const cacheDoc = await this.firestoreService.doc('settings', 'google_reviews').get();
        if (cacheDoc.exists) {
          const data = cacheDoc.data() as any;
          if (data && data.cachedAt) {
            const cachedTime = new Date(data.cachedAt).getTime();
            if (now - cachedTime < this.CACHE_TTL_MS) {
              this.memoryCache = data;
              this.lastFetchTime = cachedTime;
              return data;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not read reviews from Firestore cache: ${err.message}`);
      }
    }

    // 3. Fetch fresh reviews directly from Google Places API
    try {
      const freshData = await this.fetchFromGooglePlaces(apiKey, placeId, customBusinessUrl);
      this.memoryCache = freshData;
      this.lastFetchTime = now;

      // Save to Firestore so it survives server restarts
      try {
        await this.firestoreService.doc('settings', 'google_reviews').set(freshData, { merge: true });
      } catch (err: any) {
        this.logger.warn(`Could not persist reviews into Firestore: ${err.message}`);
      }

      return freshData;
    } catch (err: any) {
      this.logger.error(`Error fetching reviews from Google Places API: ${err.message}`);

      // If we have an existing cache (even if older than TTL), fall back to it
      if (this.memoryCache) {
        return this.memoryCache;
      }

      return {
        configured: true,
        name: 'MARJAAH Qatar',
        rating: 5.0,
        userRatingCount: 0,
        googleMapsUri: customBusinessUrl || 'https://maps.google.com',
        writeReviewUri: customBusinessUrl || 'https://maps.google.com',
        reviews: [],
        message: `Failed to fetch from Google Places API: ${err.message}`,
      };
    }
  }

  /**
   * Fetch details and reviews using Google Places API (supports both Places API New & Legacy Place Details)
   */
  private async fetchFromGooglePlaces(
    apiKey: string,
    placeId: string,
    customBusinessUrl?: string,
  ): Promise<GoogleReviewsResponse> {
    this.logger.log(`Fetching live Google reviews for placeId: ${placeId}...`);

    // Standard Google Place Details endpoint
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId,
    )}&fields=name,rating,reviews,user_ratings_total,url&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API HTTP ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || ''}`);
    }

    const result = data.result || {};
    const rawReviews: any[] = result.reviews || [];

    const reviews: GoogleReviewItem[] = rawReviews.map((r: any, idx: number) => ({
      id: `${r.time || Date.now()}-${idx}`,
      authorName: r.author_name || 'Verified Customer',
      authorPhotoUrl: r.profile_photo_url || '',
      rating: typeof r.rating === 'number' ? r.rating : 5,
      text: r.text || '',
      relativeTimeDescription: r.relative_time_description || '',
      publishTime: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString(),
      authorUrl: r.author_url || '',
    }));

    const mapsUrl = result.url || customBusinessUrl || `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
    const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;

    return {
      configured: true,
      name: result.name || 'MARJAAH Qatar (M.SHOP)',
      rating: typeof result.rating === 'number' ? result.rating : 5.0,
      userRatingCount: typeof result.user_ratings_total === 'number' ? result.user_ratings_total : reviews.length,
      googleMapsUri: mapsUrl,
      writeReviewUri: writeReviewUrl,
      reviews: reviews,
      cachedAt: new Date().toISOString(),
    };
  }
}
