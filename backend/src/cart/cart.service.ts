import { Injectable, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface CartItemDto {
  id?: string;
  slug?: string;
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(private readonly firestore: FirestoreService) {}

  async validateAndComputeCart(items: CartItemDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        count: 0,
      };
    }

    const validatedItems: any[] = [];
    let subtotal = 0;
    let count = 0;

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      let product: any = null;

      if (item.id) {
        const doc = await this.firestore.doc('products', item.id).get();
        if (doc.exists) {
          product = { id: doc.id, ...doc.data() };
        }
      }

      if (!product && (item.slug || item.id)) {
        const queryVal = item.slug || item.id;
        const snap = await this.firestore.collection('products')
          .where('slug', '==', queryVal)
          .limit(1)
          .get();

        if (!snap.empty) {
          product = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      if (product) {
        const unitPrice = Number(product.price) || 0;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        count += qty;

        const firstImage = product.image || (Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : (product.first_image || product.primary_image || '/static/images/placeholder.svg'));

        validatedItems.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          name_ar: product.name_ar || '',
          brand: product.brand || '',
          image: firstImage,
          price: unitPrice,
          original_price: product.original_price ? Number(product.original_price) : null,
          quantity: qty,
          in_stock: Boolean(product.in_stock),
          stock_count: product.stock_count,
          line_total: lineTotal,
        });
      }
    }

    // Shipping policy: Free shipping if subtotal >= 200 QAR, otherwise 20 QAR
    const shipping = subtotal >= 200 || subtotal === 0 ? 0 : 20;
    const total = subtotal + shipping;

    return {
      items: validatedItems,
      subtotal,
      shipping,
      total,
      count,
    };
  }
}
