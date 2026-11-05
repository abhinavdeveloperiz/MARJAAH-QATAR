import { Module } from '@nestjs/common';
import { StoreLocationsController } from './store-locations.controller';
import { StoreLocationsService } from './store-locations.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [FirebaseModule, AdminModule],
  controllers: [StoreLocationsController],
  providers: [StoreLocationsService],
  exports: [StoreLocationsService],
})
export class StoreLocationsModule {}

