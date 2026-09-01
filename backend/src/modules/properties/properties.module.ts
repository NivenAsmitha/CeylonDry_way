import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyPhotoStorageModule } from '../property-photos/property-photo-storage.module';
import { PropertyPhotosController } from '../property-photos/property-photos.controller';
import { PropertyPhotosService } from '../property-photos/property-photos.service';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [AuthModule, PropertyPhotoStorageModule],
  controllers: [PropertiesController, PropertyPhotosController],
  providers: [PropertiesService, PropertyPhotosService],
  exports: [PropertiesService, PropertyPhotosService],
})
export class PropertiesModule {}
