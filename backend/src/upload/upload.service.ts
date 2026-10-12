import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface UploadResult {
  url: string;
  filename: string;
  path: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly firestoreService: FirestoreService) {}

  async uploadFile(file: any, folder = 'products'): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for upload');
    }

    const bucket = this.firestoreService.getBucket();
    const cleanOriginalName = (file.originalname || 'image.jpg')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_');
    const timestamp = Date.now();
    const destinationPath = `${folder}/${timestamp}_${cleanOriginalName}`;
    const fileRef = bucket.file(destinationPath);

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });

    try {
      await fileRef.makePublic();
    } catch (e: any) {
      this.logger.warn(`Could not set public permissions on ${destinationPath}: ${e.message}`);
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    this.logger.log(`Uploaded file to Firebase Storage: ${publicUrl}`);

    return {
      url: publicUrl,
      filename: cleanOriginalName,
      path: destinationPath,
    };
  }

  async uploadBase64(base64Data: string, originalName: string, folder = 'products'): Promise<UploadResult> {
    if (!base64Data) {
      throw new BadRequestException('No base64 data provided');
    }

    let cleanBase64 = base64Data;
    let mimeType = 'image/jpeg';

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const bucket = this.firestoreService.getBucket();
    const cleanOriginalName = (originalName || 'uploaded.jpg')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_');
    const timestamp = Date.now();
    const destinationPath = `${folder}/${timestamp}_${cleanOriginalName}`;
    const fileRef = bucket.file(destinationPath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    try {
      await fileRef.makePublic();
    } catch (e: any) {
      this.logger.warn(`Could not set public permissions: ${e.message}`);
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    this.logger.log(`Uploaded base64 to Firebase Storage: ${publicUrl}`);

    return {
      url: publicUrl,
      filename: cleanOriginalName,
      path: destinationPath,
    };
  }
}
