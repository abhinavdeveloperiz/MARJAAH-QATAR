import { Module, forwardRef } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => AdminModule)],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
