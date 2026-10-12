import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class BannersService {
  constructor(private readonly firestore: FirestoreService) {}

  async findAll(type?: string) {
    let query: any = this.firestore.collection('banners');
    if (type) {
      query = query.where('banner_type', '==', type);
    }
    const snap = await query.get();
    const banners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    banners.sort((a, b) => (a.order || 0) - (b.order || 0));
    return banners;
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('banners', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(data: any) {
    if (!data.title) {
      throw new BadRequestException('Banner title is required');
    }
    const banner = {
      ...data,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      order: Number(data.order) || 0,
      banner_type: data.banner_type || 'hero',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('banners').add(banner);
    return { id: ref.id, ...banner };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('banners', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('banners', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    await docRef.delete();
    return { success: true, message: `Banner ${id} deleted` };
  }
}
