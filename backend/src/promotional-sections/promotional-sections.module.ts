import { Module } from '@nestjs/common';
import { PromotionalSectionsController } from './promotional-sections.controller';
import { PromotionalSectionsService } from './promotional-sections.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [FirebaseModule, AdminModule],
  controllers: [PromotionalSectionsController],
  providers: [PromotionalSectionsService],
  exports: [PromotionalSectionsService],
})
export class PromotionalSectionsModule {}

