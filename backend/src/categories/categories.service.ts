import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
  ) {}

  async findAll() {
    const snap = await this.firestore.collection('categories').get();
    const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    return categories;
  }

  async findOne(slugOrId: string) {
    // Try by ID first
    const doc = await this.firestore.doc('categories', slugOrId).get();
    if (doc.exists) {
      const data = doc.data();
      const subcategories = await this.findSubcategories(doc.id, data?.slug);
      return { id: doc.id, ...data, subcategories };
    }

    // Try by slug
    const snap = await this.firestore.collection('categories')
      .where('slug', '==', slugOrId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new NotFoundException(`Category not found: ${slugOrId}`);
    }

    const catDoc = snap.docs[0];
    const data = catDoc.data();
    const subcategories = await this.findSubcategories(catDoc.id, data.slug);
    return { id: catDoc.id, ...data, subcategories };
  }

  private async findSubcategories(categoryId: string, slug?: string) {
    let snap = await this.firestore.collection('subcategories')
      .where('category_id', '==', categoryId)
      .get();

    if (snap.empty && slug) {
      snap = await this.firestore.collection('subcategories')
        .where('category_slug', '==', slug)
        .get();
    }

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async create(data: any) {
    if (!data.name || !data.slug) {
      throw new BadRequestException('Name and slug are required');
    }
    const now = new Date().toISOString();

    let image = data.image;
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(image, `cat_${data.slug}.jpg`, 'categories');
      image = uploadRes.url;
    }

    const category = {
      ...data,
      image: image || null,
      is_featured: Boolean(data.is_featured),
      order: Number(data.order) || 0,
      product_count: Number(data.product_count) || 0,
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('categories').add(category);
    return { id: ref.id, ...category };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('categories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(data.image, `cat_${id}.jpg`, 'categories');
      updateData.image = uploadRes.url;
    }

    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('categories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    await docRef.delete();
    return { success: true, message: `Category ${id} deleted` };
  }
}
