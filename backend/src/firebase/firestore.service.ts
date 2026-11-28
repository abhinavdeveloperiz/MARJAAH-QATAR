import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  onModuleInit() {
    if (admin.apps.length === 0) {
      let credentialOption: admin.credential.Credential | null = null;

      // 1. Check for complete JSON in APP_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY
      const saKey = process.env.APP_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (saKey) {
        try {
          const sa = JSON.parse(saKey);
          if (sa.private_key) {
            sa.private_key = sa.private_key.replace(/\\n/g, '\n');
          }
          credentialOption = admin.credential.cert(sa);
          this.logger.log('Using credentials from service account key environment variable');
        } catch (e: any) {
          this.logger.warn(`Failed to parse service account key env var: ${e.message}`);
        }
      }

      // 2. Check for individual environment variables
      const clientEmail = process.env.APP_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = process.env.APP_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
      if (!credentialOption && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        credentialOption = admin.credential.cert({
          projectId: process.env.APP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'marjaah-ab2a6',
          clientEmail: clientEmail,
          privateKey: privateKey,
        });
        this.logger.log('Using credentials from client email / private key environment variables');
      }

      // 3. Fallback to file path if specified in credentials path or default files
      if (!credentialOption) {
        const credPath = process.env.APP_CREDENTIALS_PATH || process.env.FIREBASE_CREDENTIALS_PATH || path.resolve(process.cwd(), 'firebase-credentials.json');
        const rootCredPath = path.resolve(process.cwd(), '../firebase-credentials.json');

        if (fs.existsSync(credPath)) {
          this.logger.log(`Using credentials file: ${credPath}`);
          const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
          credentialOption = admin.credential.cert(serviceAccount);
        } else if (fs.existsSync(rootCredPath)) {
          this.logger.log(`Using credentials file: ${rootCredPath}`);
          const serviceAccount = JSON.parse(fs.readFileSync(rootCredPath, 'utf8'));
          credentialOption = admin.credential.cert(serviceAccount);
        } else {
          this.logger.log('Using Application Default Credentials (ADC)');
          credentialOption = admin.credential.applicationDefault();
        }
      }

      const storageBucket = process.env.APP_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'marjaah-ab2a6.firebasestorage.app';
      const projectId = process.env.APP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'marjaah-ab2a6';

      admin.initializeApp({
        credential: credentialOption,
        projectId: projectId,
        storageBucket: storageBucket,
      });
      this.logger.log(`Firebase initialized for project: ${projectId}, storage bucket: ${storageBucket}`);
    }

    this.db = admin.firestore();
    try {
      this.db.settings({ ignoreUndefinedProperties: true });
    } catch (e: any) {
      this.logger.debug(`Firestore settings note: ${e.message}`);
    }
    this.storage = admin.storage();
    this.logger.log('Firebase Firestore and Storage initialized successfully');
  }

  /** Shared catalog version (meta/catalog). Bumped on every product write so every instance sees changes quickly. */
  async getCatalogVersion(): Promise<string> {
    try {
      const snap = await this.collection('meta').doc('catalog').get();
      return snap.exists ? String(snap.data()?.version || '') : '';
    } catch (_) {
      return '';
    }
  }

  async bumpCatalogVersion(): Promise<string> {
    const version = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    try {
      await this.collection('meta').doc('catalog').set({ version, updated_at: new Date().toISOString() }, { merge: true });
    } catch (_) {}
    return version;
  }

  /**
   * Atomically allocates the next MTQ-XXXXX order number from `counters/orders`.
   * On first use the counter is seeded from the highest existing order number.
   */
  async nextOrderNumber(): Promise<string> {
    const db = this.getFirestore();
    const ref = db.collection('counters').doc('orders');
    const seedSnap = (await ref.get()).exists ? null : await db.collection('orders').select('order_number').get();
    let seed = 0;
    if (seedSnap) {
      seed = seedSnap.size;
      for (const d of seedSnap.docs) {
        const m = /^MTQ-(\d+)$/i.exec(String(d.get('order_number') || ''));
        if (m) seed = Math.max(seed, parseInt(m[1], 10));
      }
    }
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? Number(snap.data()?.last || 0) : seed;
      const value = current + 1;
      tx.set(ref, { last: value, updated_at: new Date().toISOString() }, { merge: true });
      return value;
    });
    return `MTQ-${String(next).padStart(5, '0')}`;
  }

  /** Transactionally decrements product stock (never below zero). Missing/untracked stock is ignored. */
  async decrementStock(productId: any, quantity: number): Promise<void> {
    const db = this.getFirestore();
    const ref = this.doc('products', productId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = snap.data()?.stock_count;
      if (current === undefined || current === null) return;
      const newStock = Math.max(0, Number(current) - Number(quantity));
      tx.update(ref, { stock_count: newStock, in_stock: newStock > 0 });
    });
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
      try {
        this.db.settings({ ignoreUndefinedProperties: true });
      } catch (e: any) {}
    }
    return this.db;
  }

  getStorage(): admin.storage.Storage {
    if (!this.storage) {
      this.storage = admin.storage();
    }
    return this.storage;
  }

  getBucket() {
    return this.getStorage().bucket();
  }

  collection(collectionName: string): admin.firestore.CollectionReference {
    return this.getFirestore().collection(collectionName);
  }

  doc(collectionName: string, id: any): admin.firestore.DocumentReference {
    return this.getFirestore().collection(collectionName).doc(String(id !== undefined && id !== null ? id : ''));
  }
}
