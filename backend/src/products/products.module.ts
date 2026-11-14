import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';
import { AdminModule } from '../admin/admin.module';
import { SeoModule } from '../seo/seo.module';

@Module({
  imports: [UploadModule, forwardRef(() => AdminModule), forwardRef(() => SeoModule)],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
