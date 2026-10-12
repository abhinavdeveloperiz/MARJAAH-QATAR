import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

export interface UploadResult {
  url: string;
  filename: string;
  path: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly firestoreService: FirestoreService) {}

  private sanitizeFolder(folder: string): string {
    const clean = (folder || 'products').replace(/[^a-zA-Z0-9_-]/g, '');
    return clean || 'products';
  }

  async uploadFile(file: any, rawFolder = 'products'): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for upload');
    }

    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 5MB maximum allowed size');
    }

    const mime = (file.mimetype || 'image/jpeg').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(`Unsupported file type: ${mime}. Only JPEG, PNG, WEBP, GIF, and SVG are permitted.`);
    }

    const folder = this.sanitizeFolder(rawFolder);
    const bucket = this.firestoreService.getBucket();
    const cleanOriginalName = (file.originalname || 'image.jpg')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/\.+/g, '.');
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

  async uploadBase64(base64Data: string, originalName: string, rawFolder = 'products'): Promise<UploadResult> {
    if (!base64Data) {
      throw new BadRequestException('No base64 data provided');
    }

    let cleanBase64 = base64Data;
    let mimeType = 'image/jpeg';

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      mimeType = (parts[0].replace('data:', '') || 'image/jpeg').toLowerCase();
      cleanBase64 = parts[1];
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}. Only JPEG, PNG, WEBP, GIF, and SVG are permitted.`);
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 5MB maximum allowed size');
    }

    const folder = this.sanitizeFolder(rawFolder);
    const bucket = this.firestoreService.getBucket();
    const cleanOriginalName = (originalName || 'uploaded.jpg')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/\.+/g, '.');
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
