import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: any,
    @Query('folder') folder?: string,
    @Body('folder') bodyFolder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please provide an image file with key "image"');
    }
    const targetFolder = folder || bodyFolder || 'products';
    return this.uploadService.uploadFile(file, targetFolder);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileField(
    @UploadedFile() file: any,
    @Query('folder') folder?: string,
    @Body('folder') bodyFolder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please provide a file with key "file"');
    }
    const targetFolder = folder || bodyFolder || 'products';
    return this.uploadService.uploadFile(file, targetFolder);
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
