import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryPropertyPhotoStorage } from './cloudinary-property-photo-storage';
import { LocalPropertyPhotoStorage } from './local-property-photo-storage';
import { PROPERTY_PHOTO_STORAGE } from './property-photo.constants';
import { PropertyPhotoImageService } from './property-photo-image.service';
import { PropertyPhotoMediaController } from './property-photo-media.controller';

@Module({
  controllers: [PropertyPhotoMediaController],
  providers: [
    PropertyPhotoImageService,
    {
      provide: PROPERTY_PHOTO_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const environment = config.get<string>('NODE_ENV') ?? 'development';
        const configuredProvider = config.get<string>(
          'PROPERTY_PHOTO_STORAGE_PROVIDER',
        );
        const provider =
          configuredProvider ||
          (environment === 'production' ? 'cloudinary' : 'local');

        if (environment === 'production' && provider !== 'cloudinary') {
          throw new Error(
            'Production property-photo storage must use Cloudinary',
          );
        }
        return provider === 'cloudinary'
          ? new CloudinaryPropertyPhotoStorage(config)
          : new LocalPropertyPhotoStorage(config);
      },
    },
  ],
  exports: [PROPERTY_PHOTO_STORAGE, PropertyPhotoImageService],
})
export class PropertyPhotoStorageModule {}
