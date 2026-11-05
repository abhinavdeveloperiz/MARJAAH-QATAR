import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface PageViewTrackDto {
  path: string;
  referrer?: string;
  device?: string; // 'mobile' | 'desktop' | 'tablet'
  locale?: string;
  sessionId?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly firestore: FirestoreService) {}

  async trackPageView(dto: PageViewTrackDto) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cleanPath = (dto.path || '/').split('?')[0].replace(/\/+$/, '') || '/';
      const device = (dto.device || 'desktop').toLowerCase();
      const referrer = (dto.referrer || 'direct').toLowerCase();

      const docRef = this.firestore.collection('site_analytics_daily').doc(today);
      const doc = await docRef.get();

      if (!doc.exists) {
        await docRef.set({
          date: today,
          total_views: 1,
          unique_sessions: dto.sessionId ? [dto.sessionId] : [],
          unique_count: 1,
          paths: { [cleanPath]: 1 },
          devices: { [device]: 1 },
          referrers: { [referrer]: 1 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        const data = doc.data() || {};
        const total = (data.total_views || 0) + 1;
        const paths = data.paths || {};
        paths[cleanPath] = (paths[cleanPath] || 0) + 1;

        const devices = data.devices || {};
        devices[device] = (devices[device] || 0) + 1;

        const referrers = data.referrers || {};
        referrers[referrer] = (referrers[referrer] || 0) + 1;

        const sessions: string[] = Array.isArray(data.unique_sessions) ? data.unique_sessions : [];
        if (dto.sessionId && !sessions.includes(dto.sessionId) && sessions.length < 5000) {
          sessions.push(dto.sessionId);
        }

        await docRef.update({
          total_views: total,
          unique_count: sessions.length || total,
          paths,
          devices,
          referrers,
          updated_at: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (e: any) {
      this.logger.debug(`Analytics tracking note: ${e.message}`);
      return { success: false };
    }
  }

  async getTrafficStats(days = 30) {
    const snap = await this.firestore.collection('site_analytics_daily').get();
    const allDays = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    allDays.sort((a, b) => a.date.localeCompare(b.date));

    const recent = allDays.slice(-days);

    let totalViews = 0;
    let totalUnique = 0;
    const pathsAgg: Record<string, number> = {};
    const devicesAgg: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    const timeline: { date: string; views: number; visitors: number }[] = [];

    for (const day of recent) {
      const v = Number(day.total_views) || 0;
      const u = Number(day.unique_count) || Math.round(v * 0.7);
      totalViews += v;
      totalUnique += u;

      timeline.push({
        date: day.date,
        views: v,
        visitors: u,
      });

      if (day.paths) {
        for (const [p, c] of Object.entries(day.paths)) {
          pathsAgg[p] = (pathsAgg[p] || 0) + Number(c);
        }
      }
      if (day.devices) {
        for (const [dev, c] of Object.entries(day.devices)) {
          devicesAgg[dev] = (devicesAgg[dev] || 0) + Number(c);
        }
      }
    }

    const topPages = Object.entries(pathsAgg)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalViews,
      totalVisitors: totalUnique,
      timeline,
      devices: devicesAgg,
      topPages,
    };
  }
}

