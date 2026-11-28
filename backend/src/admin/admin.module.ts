import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit/audit.service';
import { RbacGuard } from './rbac/rbac.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { BannersModule } from '../banners/banners.module';
import { CategoriesModule } from '../categories/categories.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [
    FirebaseModule,
    CartModule,
    forwardRef(() => ProductsModule),
    forwardRef(() => BannersModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => SubcategoriesModule),
    forwardRef(() => BrandsModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuditService, RbacGuard],
  exports: [AdminService, AuditService, RbacGuard],
})
export class AdminModule {}
