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

      // 1. Check for complete JSON in FIREBASE_SERVICE_ACCOUNT_KEY environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          if (sa.private_key) {
            sa.private_key = sa.private_key.replace(/\\n/g, '\n');
          }
          credentialOption = admin.credential.cert(sa);
          this.logger.log('Using credentials from FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        } catch (e: any) {
          this.logger.warn(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var: ${e.message}`);
        }
      }

      // 2. Check for individual environment variables
      if (!credentialOption && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        credentialOption = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        });
        this.logger.log('Using credentials from FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY environment variables');
      }

      // 3. Fallback to file path if specified in FIREBASE_CREDENTIALS_PATH or default files
      if (!credentialOption) {
        const credPath = process.env.FIREBASE_CREDENTIALS_PATH || path.resolve(process.cwd(), 'firebase-credentials.json');
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

      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'marjaah-ab2a6.firebasestorage.app';

      admin.initializeApp({
        credential: credentialOption,
        projectId: process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
        storageBucket: storageBucket,
      });
      this.logger.log(`Firebase initialized with storage bucket: ${storageBucket}`);
    }

    this.db = admin.firestore();
    this.storage = admin.storage();
    this.logger.log('Firebase Firestore and Storage initialized successfully');
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
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

  doc(collectionName: string, id: string): admin.firestore.DocumentReference {
    return this.getFirestore().collection(collectionName).doc(id);
  }
}
