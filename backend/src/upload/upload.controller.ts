import {
  Controller,
  Post,
  Req,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

async function parseMultipart(req: any): Promise<{ file: any; fields: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    let busboyInstance: any;
    try {
      const busboy = require('busboy');
      busboyInstance = busboy({ headers: req.headers });
    } catch (e) {
      return reject(e);
    }

    const fields: Record<string, string> = {};
    let parsedFile: any = null;

    busboyInstance.on('file', (fieldname: string, fileStream: any, info: any) => {
      const chunks: Buffer[] = [];
      fileStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      fileStream.on('end', () => {
        if (!parsedFile || fieldname === 'image' || fieldname === 'file') {
          parsedFile = {
            fieldname,
            originalname: info.filename,
            mimetype: info.mimeType,
            buffer: Buffer.concat(chunks),
          };
        }
      });
    });

    busboyInstance.on('field', (name: string, val: string) => {
      fields[name] = val;
    });

    busboyInstance.on('finish', () => {
      resolve({ file: parsedFile, fields });
    });

    busboyInstance.on('error', (err: any) => {
      reject(err);
    });

    // Google Cloud Functions buffers the entire raw body into req.rawBody
    if (req.rawBody) {
      busboyInstance.end(req.rawBody);
    } else {
      req.pipe(busboyInstance);
    }
  });
}

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('image')
  async uploadImage(
    @Req() req: any,
    @Query('folder') folder?: string,
    @Body('folder') bodyFolder?: string,
  ) {
    // If request body is JSON with base64 data
    if (req.body && req.body.data) {
      const targetFolder = folder || req.body.folder || bodyFolder || 'products';
      return this.uploadService.uploadBase64(
        req.body.data,
        req.body.filename || 'image.jpg',
        targetFolder,
      );
    }

    // If request is multipart/form-data
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const { file, fields } = await parseMultipart(req);
      if (!file) {
        throw new BadRequestException('No image file provided in multipart form data');
      }
      const targetFolder = folder || fields.folder || bodyFolder || 'products';
      return this.uploadService.uploadFile(file, targetFolder);
    }

    throw new BadRequestException('Please provide an image file or base64 data');
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('file')
  async uploadFileField(
    @Req() req: any,
    @Query('folder') folder?: string,
    @Body('folder') bodyFolder?: string,
  ) {
    if (req.body && req.body.data) {
      const targetFolder = folder || req.body.folder || bodyFolder || 'products';
      return this.uploadService.uploadBase64(
        req.body.data,
        req.body.filename || 'file.jpg',
        targetFolder,
      );
    }

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const { file, fields } = await parseMultipart(req);
      if (!file) {
        throw new BadRequestException('No file provided in multipart form data');
      }
      const targetFolder = folder || fields.folder || bodyFolder || 'products';
      return this.uploadService.uploadFile(file, targetFolder);
    }

    throw new BadRequestException('Please provide a file or base64 data');
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('base64')
  async uploadBase64(
    @Body('data') data: string,
    @Body('filename') filename: string,
    @Body('folder') folder?: string,
  ) {
    if (!data) {
      throw new BadRequestException('Base64 image data is required in "data" property');
    }
    return this.uploadService.uploadBase64(data, filename || 'image.jpg', folder || 'products');
  }
}
