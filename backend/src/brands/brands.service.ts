import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class BrandsService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
  ) {}

  async findAll() {
    const snap = await this.firestore.collection('brands').get();
    const brands = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    brands.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return brands;
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('brands', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(data: any) {
    if (!data.name) {
      throw new BadRequestException('Brand name is required');
    }

    let logo = data.logo || '';
    if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(
        logo,
        `brand_${data.slug || 'logo'}.jpg`,
        'brands',
      );
      logo = uploadRes.url;
    }

    const brand = {
      ...data,
      logo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('brands').add(brand);
    return { id: ref.id, ...brand };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('brands', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(
        data.logo,
        `brand_${id}.jpg`,
        'brands',
      );
      updateData.logo = uploadRes.url;
    }

    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('brands', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    await docRef.delete();
    return { success: true, message: `Brand ${id} deleted` };
  }
}
