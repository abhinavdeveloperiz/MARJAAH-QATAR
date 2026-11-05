import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { AuditService } from '../admin/audit/audit.service';

export interface PromotionalSectionDto {
  title: string;
  title_ar?: string;
  badge?: string;
  badge_ar?: string;
  subtitle: string;
  subtitle_ar?: string;
  image_desktop: string;
  image_mobile?: string;
  card_tag?: string;
  card_price?: string;
  card_link?: string;
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
export class PromotionalSectionsService implements OnModuleInit {
  private readonly logger = new Logger(PromotionalSectionsService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPromotionalSection();
  }

  async ensureDefaultPromotionalSection() {
    try {
      const snap = await this.firestore.collection('promotional_sections').limit(1).get();
      if (snap.empty) {
        const defaultPromo: PromotionalSectionDto = {
          title: 'ULTRA RIGS & WORKSTATIONS',
          title_ar: 'منصات الألعاب ومحطات العمل الفائقة',
          badge: 'AUTHORIZED GCC DISTRIBUTION',
          badge_ar: 'توزيع معتمد في دول مجلس التعاون الخليجي',
          subtitle: "Bridging the pinnacle of global computing hardware with Qatar's visionary tech community. Every workstation, GPU, curved display, and peripheral comes backed with local authorized warranties and express Doha dispatch.",
          subtitle_ar: 'نوفر قمة عتاد الحوسبة العالمي لمجتمع التقنية الرائد في قطر. كل محطة عمل، ومعالج رسومي، وشاشة، وملحقات تأتي مشمولة بضمانات محلية معتمدة وتوصيل سريع في الدوحة.',
          image_desktop: '/assets/images/products/asus-rog-g16.jpg',
          image_mobile: '/assets/images/products/asus-rog-g16.jpg',
          card_tag: 'ROG STRIX SCAR 18',
          card_price: 'QAR 12,499',
          card_link: '/shop/',
          cta_text: 'DISCOVER ALL PRODUCTS',
          cta_text_ar: 'استكشف كافة المنتجات',
          cta_link: '/shop/',
          secondary_cta_text: 'WHATSAPP HARDWARE DESK',
          secondary_cta_text_ar: 'مكتب الواتساب للمساعدة',
          secondary_cta_link: 'https://wa.me/97477991013',
          is_active: true,
          order: 1,
        };

        const docRef = await this.firestore.collection('promotional_sections').add({
          ...defaultPromo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.logger.log(`Default promotional section seeded: ${docRef.id}`);
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed default promo section: ${e.message}`);
    }
  }

  async findAll(includeInactive = false) {
    const snap = await this.firestore.collection('promotional_sections').get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    if (!includeInactive) {
      const now = new Date().getTime();
      items = items.filter((item) => {
        if (item.is_active === false) return false;
        if (item.start_date && new Date(item.start_date).getTime() > now) return false;
        if (item.end_date && new Date(item.end_date).getTime() < now) return false;
        return true;
      });
    }

    items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    return items;
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('promotional_sections', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Promotional section ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: PromotionalSectionDto, adminUser?: any) {
    if (!dto.title || !dto.image_desktop) {
      throw new BadRequestException('Title and desktop image are required');
    }

    const now = new Date().toISOString();
    const payload = {
      ...dto,
      is_active: dto.is_active !== undefined ? Boolean(dto.is_active) : true,
      order: Number(dto.order) || 0,
      image_mobile: dto.image_mobile || dto.image_desktop,
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('promotional_sections').add(payload);

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'create',
        module: 'website_content',
        target_id: ref.id,
        target_title: dto.title,
        details: payload,
      });
    }

    return { id: ref.id, ...payload };
  }

  async update(id: string, dto: Partial<PromotionalSectionDto>, adminUser?: any) {
    const docRef = this.firestore.doc('promotional_sections', id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Promotional section ${id} not found`);
    }

    const now = new Date().toISOString();
    const updateData: any = {
      ...dto,
      updated_at: now,
    };

    await docRef.update(updateData);

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'edit',
        module: 'website_content',
        target_id: id,
        target_title: dto.title || existing.data()?.title,
        details: { before: existing.data(), after: updateData },
      });
    }

    return { id, ...existing.data(), ...updateData };
  }

  async remove(id: string, adminUser?: any) {
    const docRef = this.firestore.doc('promotional_sections', id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Promotional section ${id} not found`);
    }

    const title = existing.data()?.title || id;
    await docRef.delete();

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'delete',
        module: 'website_content',
        target_id: id,
        target_title: title,
      });
    }

    return { success: true, message: `Promotional section "${title}" deleted successfully` };
  }
}

