import { Module, forwardRef } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { UploadModule } from '../upload/upload.module';
import { SeoModule } from '../seo/seo.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [UploadModule, forwardRef(() => SeoModule), forwardRef(() => SubcategoriesModule), forwardRef(() => ProductsModule)],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
