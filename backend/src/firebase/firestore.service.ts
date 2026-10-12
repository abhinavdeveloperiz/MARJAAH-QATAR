import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private db: admin.firestore.Firestore;

  onModuleInit() {
    if (admin.apps.length === 0) {
      const credPath = path.resolve(process.cwd(), 'firebase-credentials.json');
      const rootCredPath = path.resolve(process.cwd(), '../firebase-credentials.json');

      let credentialOption: admin.credential.Credential;

      if (fs.existsSync(credPath)) {
        this.logger.log(`Using credentials from ${credPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        credentialOption = admin.credential.cert(serviceAccount);
      } else if (fs.existsSync(rootCredPath)) {
        this.logger.log(`Using credentials from ${rootCredPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(rootCredPath, 'utf8'));
        credentialOption = admin.credential.cert(serviceAccount);
      } else {
        this.logger.log('Using Application Default Credentials');
        credentialOption = admin.credential.applicationDefault();
      }

      admin.initializeApp({
        credential: credentialOption,
        projectId: process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
      });
    }

    this.db = admin.firestore();
    this.logger.log('Firebase Admin SDK initialized successfully');
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  collection(collectionName: string): admin.firestore.CollectionReference {
    return this.getFirestore().collection(collectionName);
  }

  doc(collectionName: string, id: string): admin.firestore.DocumentReference {
    return this.getFirestore().collection(collectionName).doc(id);
  }
}
