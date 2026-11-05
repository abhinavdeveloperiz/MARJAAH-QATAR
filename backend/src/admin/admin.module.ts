import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit/audit.service';
import { RbacGuard } from './rbac/rbac.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [FirebaseModule, CartModule],
  controllers: [AdminController],
  providers: [AdminService, AuditService, RbacGuard],
  exports: [AdminService, AuditService, RbacGuard],
})
export class AdminModule {}
