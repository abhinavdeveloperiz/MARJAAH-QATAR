import { Injectable } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class AdminService {
  constructor(private readonly firestore: FirestoreService) {}

  async getDashboardStats() {
    // 1. Products & Low stock
    const productsSnap = await this.firestore.collection('products').get();
    const totalProducts = productsSnap.size;
    const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const lowStock = allProducts.filter(p => p.in_stock && Number(p.stock_count) < 10).slice(0, 8);

    // 2. Orders & Revenue
    const ordersSnap = await this.firestore.collection('orders').get();
    const totalOrders = ordersSnap.size;
    const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    allOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const recentOrders = allOrders.slice(0, 10);
    const revenueTotal = allOrders
      .filter(o => ['placed', 'processing', 'shipped', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // 3. Users
    const usersSnap = await this.firestore.collection('users').get();
    const totalUsers = usersSnap.size;

    // 4. Categories & Brands count
    const categoriesSnap = await this.firestore.collection('categories').get();
    const brandsSnap = await this.firestore.collection('brands').get();

    // 5. Contact messages
    const messagesSnap = await this.firestore.collection('contact_messages')
      .where('status', '==', 'new')
      .get();
    const newMessages = messagesSnap.size;

    return {
      productsCount: totalProducts,
      ordersCount: totalOrders,
      usersCount: totalUsers,
      lowStockProducts: lowStock,
      recentOrders: recentOrders,
      kpis: {
        products: totalProducts,
        orders: totalOrders,
        users: totalUsers,
        revenue: Math.round(revenueTotal * 100) / 100,
        low_stock: lowStock.length,
        categories: categoriesSnap.size,
        brands: brandsSnap.size,
      },
      total_products: totalProducts,
      total_orders: totalOrders,
      total_users: totalUsers,
      total_categories: categoriesSnap.size,
      total_brands: brandsSnap.size,
      revenue_total: Math.round(revenueTotal * 100) / 100,
      new_messages: newMessages,
      low_stock: lowStock,
      recent_orders: recentOrders,
      all_products: allProducts.slice(0, 20),
    };
  }
}
