import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { AuditService } from '../admin/audit/audit.service';
import { AdminService } from '../admin/admin.service';

export interface BannerDto {
  title: string;
  headline?: string;
  subtitle?: string;
  title_ar?: string;
  headline_ar?: string;
  subtitle_ar?: string;
  banner_type: string;
  image?: string;
  image_desktop?: string;
  image_mobile?: string;
  cta_text?: string;
  cta_text_ar?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_text_ar?: string;
  secondary_cta_link?: string;
  is_active?: boolean;
  order?: number;
  start_date?: string | null;
  end_date?: string | null;
}

@Injectable()
export class BannersService implements OnModuleInit {
  private readonly logger = new Logger(BannersService.name);
  private heroBannersCache: any[] | null = null;
  private heroBannersVersion: string = `${Date.now()}`;
  private heroBannersLastModified: number = Date.now();

  constructor(
    private readonly firestore: FirestoreService,
    private readonly auditService: AuditService,
    @Optional() @Inject(forwardRef(() => AdminService)) private readonly adminService?: AdminService,
  ) {}

  getHeroBannerVersionToken(): string {
    return this.heroBannersVersion;
  }

  invalidateCache() {
    this.heroBannersCache = null;
    this.heroBannersVersion = `${Date.now()}`;
    this.heroBannersLastModified = Date.now();
    this.logger.log(`[BannersService] Hero banners cache invalidated. New version: ${this.heroBannersVersion}`);
  }

  async getVersion(type?: string) {
    if ((type === 'hero' || !type) && !this.heroBannersCache) {
      await this.findAll('hero', false);
    }
    return {
      type: type || 'hero',
      version: this.heroBannersVersion,
      last_modified: this.heroBannersLastModified,
      count: this.heroBannersCache ? this.heroBannersCache.length : null,
    };
  }

  async onModuleInit() {
    await this.ensureDefaultHeroBanner();
  }

  async ensureDefaultHeroBanner() {
    try {
      const snap = await this.firestore.collection('banners').where('banner_type', '==', 'hero').get();
      if (snap.empty) {
        const defaultHero: BannerDto = {
          title: 'Main Homepage Hero Banner',
          headline: 'M.SHOP Technology, Lifestyle & More – All in One Place',
          subtitle: 'Discover quality electronics, smart technology, and home appliances at great value.',
          headline_ar: 'كل ما يحتاجه منزلك، في مكان واحد',
          subtitle_ar: 'اكتشف أرقى الإلكترونيات والتقنيات الذكية والأجهزة المنزلية بأفضل قيمة.',
          banner_type: 'hero',
          image_desktop: '/assets/images/banners/hero-station.jpg',
          image_mobile: '/assets/images/banners/hero-station.jpg',
          image: '/assets/images/banners/hero-station.jpg',
          cta_text: 'Shop All Collections',
          cta_text_ar: 'تسوق جميع التشكيلات',
          cta_link: '/shop/',
          secondary_cta_text: 'Explore Smart Home & Appliances',
          secondary_cta_text_ar: 'استكشف المنزل الذكي والأجهزة',
          secondary_cta_link: '/shop/?category=home-appliances',
          is_active: true,
          order: 1,
        };

        const docRef = await this.firestore.collection('banners').add({
          ...defaultHero,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.logger.log(`Default hero banner seeded: ${docRef.id}`);
      } else {
        // Ensure headline and subtitle are populated on existing hero banner
        const firstHero = snap.docs[0];
        const data = firstHero.data() || {};
        if (!data.headline || data.headline.includes('TECH STORE')) {
          await firstHero.ref.update({
            headline: 'M.SHOP Technology, Lifestyle & More – All in One Place',
            subtitle: 'Discover quality electronics, smart technology, and home appliances at great value.',
            headline_ar: 'كل ما يحتاجه منزلك، في مكان واحد',
            subtitle_ar: 'اكتشف أرقى الإلكترونيات والتقنيات الذكية والأجهزة المنزلية بأفضل قيمة.',
            secondary_cta_text: 'Explore Smart Home & Appliances',
            secondary_cta_link: '/shop/?category=home-appliances',
            updated_at: new Date().toISOString(),
          });
          this.logger.log('Updated existing hero banner with comprehensive home & tech messaging');
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed default hero banner: ${e.message}`);
    }
  }

  async findAll(type?: string, includeInactive = false) {
    if (type === 'hero' && !includeInactive && this.heroBannersCache) {
      return this.heroBannersCache;
    }

    let query: any = this.firestore.collection('banners');
    if (type) {
      query = query.where('banner_type', '==', type);
    }
    const snap = await query.get();
    let banners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (!includeInactive) {
      const now = Date.now();
      banners = banners.filter(b => {
        if (b.is_active === false) return false;
        if (b.start_date && new Date(b.start_date).getTime() > now) return false;
        if (b.end_date && new Date(b.end_date).getTime() < now) return false;
        return true;
      });
    }

    banners.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    if (type === 'hero' && !includeInactive) {
      this.heroBannersCache = banners;
      const latestTs = banners.reduce((acc, b) => {
        const t = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return Math.max(acc, t);
      }, 0);
      if (latestTs > 0) {
        this.heroBannersVersion = `${latestTs}`;
        this.heroBannersLastModified = latestTs;
      }
    }

    return banners;
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('banners', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(data: any, adminUser?: any) {
    if (!data.title && !data.headline) {
      throw new BadRequestException('Banner title or headline is required');
    }

    const requiresApproval = this.adminService ? await this.adminService.isApprovalRequired('banners', 'create') : false;
    const isSuperUser = Boolean(adminUser?.is_superuser || adminUser?.username === 'admin');

    const now = new Date().toISOString();
    const banner = {
      ...data,
      title: data.title || data.headline,
      headline: data.headline || data.title,
      subtitle: data.subtitle || '',
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      order: Number(data.order) || 0,
      banner_type: data.banner_type || 'hero',
      image_desktop: data.image_desktop || data.image || '/assets/images/banners/hero-station.jpg',
      image_mobile: data.image_mobile || data.image_desktop || data.image || '/assets/images/banners/hero-station.jpg',
      image: data.image || data.image_desktop,
      status: (requiresApproval && !isSuperUser) ? 'pending_approval' : 'active',
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('banners').add(banner);

    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      await this.adminService.createApprovalSubmission({
        module: 'banners',
        operation: 'create',
        target_id: ref.id,
        target_title: banner.title,
        payload: banner,
        submitted_by: {
          id: String(adminUser.id || adminUser.sub || 'admin'),
          username: adminUser.username || 'staff',
          email: adminUser.email,
        },
      });
      return { id: ref.id, ...banner, status: 'pending_approval', pending_approval: true };
    }

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'create',
        module: 'banners',
        target_id: ref.id,
        target_title: banner.title,
        details: banner,
      });
    }

    this.invalidateCache();
    return { id: ref.id, ...banner };
  }

  async update(id: string, data: any, adminUser?: any) {
    const docRef = this.firestore.doc('banners', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }

    const requiresApproval = this.adminService ? await this.adminService.isApprovalRequired('banners', 'edit') : false;
    const isSuperUser = Boolean(adminUser?.is_superuser || adminUser?.username === 'admin');

    const now = new Date().toISOString();
    const updateData: any = {
      ...data,
      updated_at: now,
    };
    if (data.image_desktop && !data.image) updateData.image = data.image_desktop;
    if (data.image && !data.image_desktop) updateData.image_desktop = data.image;
    if (data.mobile_image && !data.image_mobile) updateData.image_mobile = data.mobile_image;
    if (data.image_mobile && !data.mobile_image) updateData.mobile_image = data.image_mobile;
    if (data.headline && !data.title) updateData.title = data.headline;
    if (data.title && !data.headline) updateData.headline = data.title;
    if (data.cta_text && !data.button_text) updateData.button_text = data.cta_text;
    if (data.button_text && !data.cta_text) updateData.cta_text = data.button_text;
    if (data.cta_link && !data.link_url) updateData.link_url = data.cta_link;
    if (data.link_url && !data.cta_link) updateData.cta_link = data.link_url;

    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      await this.adminService.createApprovalSubmission({
        module: 'banners',
        operation: 'edit',
        target_id: id,
        target_title: doc.data()?.title || id,
        payload: updateData,
        original_data: doc.data(),
        submitted_by: {
          id: String(adminUser.id || adminUser.sub || 'admin'),
          username: adminUser.username || 'staff',
          email: adminUser.email,
        },
      });
      return { id, status: 'pending_approval', pending_approval: true };
    }

    await docRef.update(updateData);

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'edit',
        module: 'banners',
        target_id: id,
        target_title: data.title || doc.data()?.title,
        details: { before: doc.data(), after: updateData },
      });
    }

    this.invalidateCache();
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string, adminUser?: any) {
    const docRef = this.firestore.doc('banners', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }

    const title = doc.data()?.title || id;
    await docRef.delete();

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'delete',
        module: 'banners',
        target_id: id,
        target_title: title,
      });
    }

    this.invalidateCache();
    return { success: true, message: `Banner ${id} deleted` };
  }
}
