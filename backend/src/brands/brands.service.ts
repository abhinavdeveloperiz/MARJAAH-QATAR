import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class BrandsService {
  constructor(private readonly firestore: FirestoreService) {}

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
    const brand = {
      ...data,
      created_at: new Date().toISOString(),
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
    await docRef.update(data);
    return { id, ...doc.data(), ...data };
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
