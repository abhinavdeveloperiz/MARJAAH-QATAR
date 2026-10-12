import { Module } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController],
  exports: [SubcategoriesService],
})
export class SubcategoriesModule {}
