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

  doc(collectionName: string, id: any): admin.firestore.DocumentReference {
    return this.getFirestore().collection(collectionName).doc(String(id !== undefined && id !== null ? id : ''));
  }
}
