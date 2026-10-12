import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean | string;
  isFeatured?: boolean | string;
  isNew?: boolean | string;
  isOnSale?: boolean | string;
  isBestSeller?: boolean | string;
  sortBy?: string; // 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'popular' | 'name'
  sort?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly firestore: FirestoreService) {}

  async findAll(query: ProductFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12));

    // Fetch all products snapshot to enable multi-field filtering and full-text search
    const snap = await this.firestore.collection('products').get();
    let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // 1. Category filter (by slug or id)
    if (query.category) {
      const catLower = query.category.toLowerCase();
      products = products.filter(p =>
        (p.category_slug && p.category_slug.toLowerCase() === catLower) ||
        (p.category && p.category.toLowerCase() === catLower) ||
        (p.category_id && p.category_id === query.category)
      );
    }

    // 2. Subcategory filter
    if (query.subcategory) {
      const subLower = query.subcategory.toLowerCase();
      products = products.filter(p =>
        (p.subcategory_slug && p.subcategory_slug.toLowerCase() === subLower) ||
        (p.subcategory && p.subcategory.toLowerCase() === subLower) ||
        (p.subcategory_id && p.subcategory_id === query.subcategory)
      );
    }

    // 3. Brand filter
    if (query.brand) {
      const brandLower = query.brand.toLowerCase();
      products = products.filter(p =>
        (p.brand && p.brand.toLowerCase() === brandLower) ||
        (p.brand_name && p.brand_name.toLowerCase() === brandLower)
      );
    }

    // 4. In Stock filter
    if (query.inStock !== undefined) {
      const inStockBool = String(query.inStock).toLowerCase() === 'true';
      products = products.filter(p => Boolean(p.in_stock) === inStockBool);
    }

    // 5. Featured / New / On Sale / Best Seller flags
    if (query.isFeatured !== undefined && String(query.isFeatured).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_featured));
    }
    if (query.isNew !== undefined && String(query.isNew).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_new));
    }
    if (query.isOnSale !== undefined && String(query.isOnSale).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_on_sale));
    }
    if (query.isBestSeller !== undefined && String(query.isBestSeller).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_best_seller));
    }

    // 6. Price range
    if (query.minPrice !== undefined && !isNaN(Number(query.minPrice))) {
      const minP = Number(query.minPrice);
      products = products.filter(p => Number(p.price) >= minP);
    }
    if (query.maxPrice !== undefined && !isNaN(Number(query.maxPrice))) {
      const maxP = Number(query.maxPrice);
      products = products.filter(p => Number(p.price) <= maxP);
    }

    // 7. Full-text search (name, name_ar, description, brand, sku, tags)
    if (query.search && query.search.trim()) {
      const terms = query.search.toLowerCase().trim().split(/\s+/);
      products = products.filter(p => {
        const target = [
          p.name || '',
          p.name_ar || '',
          p.short_description || '',
          p.description || '',
          p.brand || '',
          p.sku || '',
          ...(Array.isArray(p.tags) ? p.tags : []),
        ].join(' ').toLowerCase();

        return terms.every(t => target.includes(t));
      });
    }

    // 8. Sorting
    const sortBy = query.sortBy || query.sort || 'newest';
    products.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
        case 'price_asc':
          return Number(a.price) - Number(b.price);
        case 'price-desc':
        case 'price_desc':
          return Number(b.price) - Number(a.price);
        case 'featured':
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        case 'rating':
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        case 'popular':
          return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'newest':
        default:
          return new Date(b.created_at || b.createdAt?._seconds * 1000 || 0).getTime() - new Date(a.created_at || a.createdAt?._seconds * 1000 || 0).getTime();
      }
    });

    const total = products.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = products.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(slugOrId: string) {
    // 1. Try by doc ID
    const doc = await this.firestore.doc('products', slugOrId).get();
    let product: any = null;

    if (doc.exists) {
      product = { id: doc.id, ...doc.data() };
    } else {
      // 2. Try by slug
      const snap = await this.firestore.collection('products')
        .where('slug', '==', slugOrId)
        .limit(1)
        .get();

      if (!snap.empty) {
        product = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }

    if (!product) {
      throw new NotFoundException(`Product not found: ${slugOrId}`);
    }

    // Related products (same category or brand)
    let related: any[] = [];
    if (product.category_slug || product.category) {
      const catKey = product.category_slug || product.category;
      const relatedSnap = await this.firestore.collection('products')
        .where('category', '==', catKey)
        .limit(5)
        .get();

      related = relatedSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(p => p.id !== product.id && p.slug !== product.slug)
        .slice(0, 4);
    }

    return {
      ...product,
      related,
    };
  }

  async create(data: any) {
    if (!data.name || !data.price) {
      throw new BadRequestException('Product name and price are required');
    }
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();

    const product = {
      ...data,
      slug,
      price: Number(data.price),
      original_price: data.original_price ? Number(data.original_price) : null,
      stock_count: data.stock_count !== undefined ? Number(data.stock_count) : 10,
      in_stock: data.in_stock !== undefined ? Boolean(data.in_stock) : true,
      is_featured: Boolean(data.is_featured),
      is_new: Boolean(data.is_new),
      is_on_sale: Boolean(data.is_on_sale),
      is_best_seller: Boolean(data.is_best_seller),
      rating: Number(data.rating) || 5.0,
      review_count: Number(data.review_count) || 0,
      images: Array.isArray(data.images) ? data.images : (data.primary_image ? [data.primary_image] : ['/static/images/placeholder.svg']),
      specifications: Array.isArray(data.specifications) ? data.specifications : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('products').add(product);
    return { id: ref.id, ...product };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('products', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.original_price !== undefined) updateData.original_price = data.original_price ? Number(data.original_price) : null;
    if (data.stock_count !== undefined) updateData.stock_count = Number(data.stock_count);

    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('products', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    await docRef.delete();
    return { success: true, message: `Product ${id} deleted` };
  }
}
