import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';
import type {
  PropertyPhotoStorage,
  PropertyPhotoUploadContext,
  StoredPropertyPhoto,
} from './property-photo-storage';

export class CloudinaryPropertyPhotoStorage implements PropertyPhotoStorage {
  readonly providerName = 'cloudinary' as const;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary property-photo storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  uploadPropertyPhoto({
    propertyId,
    version,
    photo,
  }: PropertyPhotoUploadContext): Promise<StoredPropertyPhoto> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          type: 'upload',
          folder: `ceylon-dryway/properties/${propertyId}/${version}`,
          public_id: randomUUID(),
          overwrite: false,
          unique_filename: false,
          format: photo.format === 'jpeg' ? 'jpg' : photo.format,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result?.secure_url || !result.public_id) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    error
                      ? 'Cloudinary rejected the property photo upload'
                      : 'Cloudinary upload returned no asset',
                  ),
            );
            return;
          }
          resolve({ url: result.secure_url, storageKey: result.public_id });
        },
      );
      stream.end(photo.buffer);
    });
  }

  async deletePropertyPhoto(storageKey: string): Promise<void> {
    const result = (await cloudinary.uploader.destroy(storageKey, {
      resource_type: 'image',
      invalidate: true,
    })) as { result?: string };
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Cloudinary did not confirm photo deletion');
    }
  }
}
