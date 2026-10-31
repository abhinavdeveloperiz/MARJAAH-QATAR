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
    const placeId = this.configService.get<string>('GOOGLE_PLACE_ID') || 'ChIJR51rR8XPRT4RoyIq8yD-X6Q';
    const customBusinessUrl = this.configService.get<string>('GOOGLE_BUSINESS_URL') || 'https://maps.google.com/?cid=11844464962479727267';

    // If API credentials are not yet configured in .env
    if (!apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY is not configured in .env');
      return {
        configured: false,
        name: 'M Shop Qatar',
        rating: 4.7,
        userRatingCount: 26,
        googleMapsUri: customBusinessUrl || 'https://maps.google.com/?cid=11844464962479727267',
        writeReviewUri: `https://search.google.com/local/writereview?placeid=${placeId}`,
        reviews: [],
        message: 'Google Places API Key is missing. Please add GOOGLE_PLACES_API_KEY in backend/.env',
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
          // Verify cached data belongs to the correct placeId and is fresh
          if (data && data.cachedAt && data.placeId === placeId) {
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
        await this.firestoreService.doc('settings', 'google_reviews').set({ ...freshData, placeId }, { merge: true });
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
        name: 'M Shop Qatar',
        rating: 4.7,
        userRatingCount: 26,
        googleMapsUri: customBusinessUrl || 'https://maps.google.com/?cid=11844464962479727267',
        writeReviewUri: `https://search.google.com/local/writereview?placeid=${placeId}`,
        reviews: [],
        message: `Failed to fetch from Google Places API: ${err.message}`,
      };
    }
  }

  /**
   * Fetch details and reviews using Google Places API (combines most_relevant & newest for maximum coverage)
   */
  private async fetchFromGooglePlaces(
    apiKey: string,
    placeId: string,
    customBusinessUrl?: string,
  ): Promise<GoogleReviewsResponse> {
    this.logger.log(`Fetching live Google reviews for placeId: ${placeId}...`);

    // Fetch both most_relevant and newest sorting to capture all available reviews from Google Places API
    const sortModes = ['most_relevant', 'newest'];
    const fetchPromises = sortModes.map(async (sort) => {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId,
      )}&fields=name,rating,reviews,user_ratings_total,url&reviews_sort=${sort}&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    });

    const responses = await Promise.all(fetchPromises);

    let resultName = 'M Shop Qatar';
    let resultRating = 4.7;
    let resultTotalRatings = 26;
    let mapsUrl = customBusinessUrl || `https://maps.google.com/?cid=11844464962479727267`;

    const reviewMap = new Map<string, GoogleReviewItem>();

    for (const data of responses) {
      if (!data || data.status !== 'OK' || !data.result) continue;
      const resObj = data.result;

      if (resObj.name) resultName = resObj.name;
      if (typeof resObj.rating === 'number') resultRating = resObj.rating;
      if (typeof resObj.user_ratings_total === 'number') resultTotalRatings = resObj.user_ratings_total;
      if (resObj.url && !customBusinessUrl) mapsUrl = resObj.url;

      const rawReviews: any[] = resObj.reviews || [];
      for (const [idx, r] of rawReviews.entries()) {
        const author = r.author_name || `reviewer-${idx}`;
        const existing = reviewMap.get(author);
        if (!existing || (!existing.text && r.text)) {
          reviewMap.set(author, {
            id: `${r.time || Date.now()}-${idx}`,
            authorName: r.author_name || 'Verified Customer',
            authorPhotoUrl: r.profile_photo_url || '',
            rating: typeof r.rating === 'number' ? r.rating : 5,
            text: r.text || '',
            relativeTimeDescription: r.relative_time_description || '',
            publishTime: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString(),
            authorUrl: r.author_url || '',
          });
        }
      }
    }

    // Sort reviews: prioritize non-empty text reviews first
    const reviews: GoogleReviewItem[] = Array.from(reviewMap.values()).sort((a, b) => {
      if (a.text && !b.text) return -1;
      if (!a.text && b.text) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;

    return {
      configured: true,
      name: resultName,
      rating: resultRating,
      userRatingCount: resultTotalRatings,
      googleMapsUri: mapsUrl,
      writeReviewUri: writeReviewUrl,
      reviews: reviews,
      cachedAt: new Date().toISOString(),
    };
  }
}
