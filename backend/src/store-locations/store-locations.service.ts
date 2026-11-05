import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { AuditService } from '../admin/audit/audit.service';

export interface StoreLocationDto {
  name: string;
  name_ar?: string;
  address: string;
  address_ar?: string;
  city?: string;
  zone?: string;
  phone: string;
  email?: string;
  opening_hours: string;
  opening_hours_ar?: string;
  pickup_instructions?: string;
  pickup_instructions_ar?: string;
  is_active?: boolean;
  is_default?: boolean;
  order?: number;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class StoreLocationsService implements OnModuleInit {
  private readonly logger = new Logger(StoreLocationsService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultLocation();
  }

  async ensureDefaultLocation() {
    try {
      const snap = await this.firestore.collection('store_locations').limit(1).get();
      if (snap.empty) {
        const defaultLocation: StoreLocationDto = {
          name: 'MARJAAH Tech & Home Experience Hub — Al Sadd',
          name_ar: 'مرجاح للإلكترونيات والأجهزة المنزلية — السد',
          address: 'Building 42, Al Mirqab Al Jadeed St, Al Sadd',
          address_ar: 'مبنى 42، شارع المرقاب الجديد، السد',
          city: 'Doha',
          zone: 'Zone 39',
          phone: '+974 7799 1013',
          email: 'support@marjaah.qa',
          opening_hours: 'Saturday – Thursday: 9:00 AM – 10:00 PM | Friday: 2:00 PM – 10:00 PM',
          opening_hours_ar: 'السبت – الخميس: 9:00 صباحاً – 10:00 مساءً | الجمعة: 2:00 ظهراً – 10:00 مساءً',
          pickup_instructions: 'Please present your Order Confirmation Number (MTQ-XXXXX) and your QID or SMS confirmation at the collection desk.',
          pickup_instructions_ar: 'يرجى إبراز رقم تأكيد الطلب (MTQ-XXXXX) والبطاقة الشخصية القطرية أو رسالة التأكيد النصية عند مكتب الاستلام.',
          is_active: true,
          is_default: true,
          order: 1,
        };

        const docRef = await this.firestore.collection('store_locations').add({
          ...defaultLocation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.logger.log(`Default store pickup location created: ${docRef.id}`);
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed default store pickup location: ${e.message}`);
    }
  }

  async findAll(includeInactive = false) {
    const snap = await this.firestore.collection('store_locations').get();
    let locations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    if (!includeInactive) {
      locations = locations.filter((l) => l.is_active !== false);
    }

    locations.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    return locations;
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('store_locations', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Store location with ID "${id}" not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: StoreLocationDto, adminUser?: any) {
    if (!dto.name || !dto.address || !dto.phone) {
      throw new BadRequestException('Store name, address, and phone number are required');
    }

    const now = new Date().toISOString();
    const payload = {
      ...dto,
      city: dto.city || 'Doha',
      zone: dto.zone || 'Doha',
      is_active: dto.is_active !== undefined ? Boolean(dto.is_active) : true,
      is_default: Boolean(dto.is_default),
      order: Number(dto.order) || 0,
      created_at: now,
      updated_at: now,
    };

    // If marked default, unset other defaults
    if (payload.is_default) {
      const all = await this.firestore.collection('store_locations').where('is_default', '==', true).get();
      for (const d of all.docs) {
        await d.ref.update({ is_default: false });
      }
    }

    const ref = await this.firestore.collection('store_locations').add(payload);

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'create',
        module: 'store_locations',
        target_id: ref.id,
        target_title: dto.name,
        details: payload,
      });
    }

    return { id: ref.id, ...payload };
  }

  async update(id: string, dto: Partial<StoreLocationDto>, adminUser?: any) {
    const docRef = this.firestore.doc('store_locations', id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Store location with ID "${id}" not found`);
    }

    const now = new Date().toISOString();
    const updateData: any = {
      ...dto,
      updated_at: now,
    };

    if (dto.is_default) {
      const all = await this.firestore.collection('store_locations').where('is_default', '==', true).get();
      for (const d of all.docs) {
        if (d.id !== id) {
          await d.ref.update({ is_default: false });
        }
      }
    }

    await docRef.update(updateData);

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'edit',
        module: 'store_locations',
        target_id: id,
        target_title: dto.name || existing.data()?.name,
        details: { before: existing.data(), after: updateData },
      });
    }

    return { id, ...existing.data(), ...updateData };
  }

  async remove(id: string, adminUser?: any) {
    const docRef = this.firestore.doc('store_locations', id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Store location with ID "${id}" not found`);
    }

    const name = existing.data()?.name || id;
    await docRef.delete();

    if (adminUser) {
      await this.auditService.log({
        admin_id: String(adminUser.id || adminUser.sub || 'admin'),
        admin_username: adminUser.username || 'admin',
        action: 'delete',
        module: 'store_locations',
        target_id: id,
        target_title: name,
      });
    }

    return { success: true, message: `Store location "${name}" removed successfully` };
  }
}

