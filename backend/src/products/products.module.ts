import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';
import { AdminModule } from '../admin/admin.module';
import { SeoModule } from '../seo/seo.module';
import { CategoriesModule } from '../categories/categories.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [
    UploadModule,
    forwardRef(() => AdminModule),
    forwardRef(() => SeoModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => SubcategoriesModule),
    forwardRef(() => BrandsModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
