import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SubcategoriesService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(categoryId?: string, categorySlug?: string) {
    let query: any = this.firestore.collection('subcategories');

    if (categoryId) {
      query = query.where('category_id', '==', categoryId);
    } else if (categorySlug) {
      query = query.where('category_slug', '==', categorySlug);
    }

    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(slugOrId: string) {
    const doc = await this.firestore.doc('subcategories', slugOrId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }

    const snap = await this.firestore.collection('subcategories')
      .where('slug', '==', slugOrId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new NotFoundException(`Subcategory not found: ${slugOrId}`);
    }

    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  async create(data: any) {
    if (!data.name || !data.slug) {
      throw new BadRequestException('Name and slug are required');
    }
    const now = new Date().toISOString();

    let image = data.image;
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(image, `subcat_${data.slug}.jpg`, 'categories');
      image = uploadRes.url;
    }

    const subcategory = {
      ...data,
      image: image || null,
      created_at: now,
      updated_at: now,
    };
    const ref = await this.firestore.collection('subcategories').add(subcategory);
    return { id: ref.id, ...subcategory };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('subcategories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Subcategory ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(data.image, `subcat_${id}.jpg`, 'categories');
      updateData.image = uploadRes.url;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('subcategories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Subcategory ${id} not found`);
    }
    await docRef.delete();
    return { id, message: `Subcategory ${id} deleted successfully` };
  }
}
