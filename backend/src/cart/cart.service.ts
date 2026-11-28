import { Injectable, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface CartItemDto {
  id?: string;
  slug?: string;
  quantity: number;
  variant_name?: string;
  variant?: string;
  sku?: string;
}

@Injectable()
export class CartService {
  constructor(private readonly firestore: FirestoreService) {}

  private findMatchingVariant(product: any, item: CartItemDto) {
    let variants = product?.variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch {
        variants = [];
      }
    }
    if (!Array.isArray(variants) || variants.length === 0) return null;

    const targetName = String(item.variant_name || item.variant || '').trim().toLowerCase();
    const targetSku = String(item.sku || '').trim().toLowerCase();
    if (!targetName && !targetSku) return null;

    return (
      variants.find((v: any) => {
        if (!v) return false;
        const vSku = String(v.sku || '').trim().toLowerCase();
        const vName = String(v.name || [v.color, v.size].filter(Boolean).join(' / ') || '').trim().toLowerCase();
        if (targetSku && vSku && vSku === targetSku) return true;
        if (targetName && vName && vName === targetName) return true;
        return false;
      }) || null
    );
  }

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
        const matchedVariant = this.findMatchingVariant(product, item);
        const variantLabel = matchedVariant
          ? String(matchedVariant.name || [matchedVariant.color, matchedVariant.size].filter(Boolean).join(' / ') || '').trim()
          : (item.variant_name || item.variant || '').trim();

        const unitPrice =
          matchedVariant && matchedVariant.price !== undefined && matchedVariant.price !== null && Number(matchedVariant.price) > 0
            ? Number(matchedVariant.price)
            : Number(product.price) || 0;

        const origPriceRaw =
          matchedVariant && matchedVariant.original_price
            ? Number(matchedVariant.original_price)
            : product.original_price
              ? Number(product.original_price)
              : null;

        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        count += qty;

        const firstImage =
          (matchedVariant && matchedVariant.image) ||
          product.image ||
          (Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : (product.first_image || product.primary_image || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'));

        const baseInStock = Boolean(
          product.in_stock !== false &&
          product.in_stock !== 'false' &&
          product.stock_status !== 'outofstock' &&
          product.stock_status !== 'OUT_OF_STOCK' &&
          (product.stock_count === undefined || product.stock_count === null || Number(product.stock_count) > 0),
        );
        const isItemInStock =
          matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null && matchedVariant.stock !== ''
            ? Number(matchedVariant.stock) > 0
            : baseInStock;

        validatedItems.push({
          id: product.id,
          slug: product.slug,
          name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
          name_ar: product.name_ar || '',
          variant_name: variantLabel || undefined,
          sku: (matchedVariant && matchedVariant.sku) || product.sku,
          brand: product.brand || '',
          image: firstImage,
          price: unitPrice,
          original_price: origPriceRaw && origPriceRaw > unitPrice ? origPriceRaw : null,
          quantity: qty,
          in_stock: isItemInStock,
          stock_count:
            matchedVariant && matchedVariant.stock !== undefined && matchedVariant.stock !== null && matchedVariant.stock !== ''
              ? Number(matchedVariant.stock)
              : product.stock_count,
          line_total: lineTotal,
        });
      }
    }

    // Shipping policy: Free delivery across Qatar
    const shipping = 0;
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
