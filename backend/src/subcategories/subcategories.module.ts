import { Module, forwardRef } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { UploadModule } from '../upload/upload.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [UploadModule, forwardRef(() => CategoriesModule), forwardRef(() => ProductsModule)],
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController],
  exports: [SubcategoriesService],
})
export class SubcategoriesModule {}
