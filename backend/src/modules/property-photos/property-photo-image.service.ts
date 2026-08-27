import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import {
  MAX_PROPERTY_PHOTO_BYTES,
  MAX_PROPERTY_PHOTO_DIMENSION,
  MAX_PROPERTY_PHOTO_PIXELS,
} from './property-photo.constants';
import type {
  PropertyPhotoFormat,
  ValidatedPropertyPhoto,
} from './property-photo-storage';

const MIME_BY_FORMAT = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

function invalidPhoto(message: string): BadRequestException {
  return new BadRequestException({
    code: 'PROPERTY_PHOTO_INVALID',
    message,
    details: [{ field: 'photos', message }],
  });
}

function detectSignature(buffer: Buffer): PropertyPhotoFormat | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

@Injectable()
export class PropertyPhotoImageService {
  async validateAndNormalize(
    file: Express.Multer.File,
  ): Promise<ValidatedPropertyPhoto> {
    if (!file.buffer?.length) {
      throw invalidPhoto('Photo files must not be empty');
    }
    if (file.buffer.length > MAX_PROPERTY_PHOTO_BYTES) {
      throw invalidPhoto('Each photo must be 5 MB or smaller');
    }

    const signatureFormat = detectSignature(file.buffer);
    if (!signatureFormat) {
      throw invalidPhoto('Only genuine JPEG, PNG, and WebP images are allowed');
    }
    const expectedMimeType = MIME_BY_FORMAT[signatureFormat];
    if (file.mimetype !== expectedMimeType) {
      throw invalidPhoto('The declared photo type does not match its content');
    }

    try {
      const pipeline = sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: MAX_PROPERTY_PHOTO_PIXELS,
        sequentialRead: true,
      }).rotate();
      const metadata = await pipeline.metadata();

      if (
        metadata.format !== signatureFormat ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > MAX_PROPERTY_PHOTO_DIMENSION ||
        metadata.height > MAX_PROPERTY_PHOTO_DIMENSION ||
        metadata.width * metadata.height > MAX_PROPERTY_PHOTO_PIXELS
      ) {
        throw invalidPhoto('Photo dimensions or encoded content are invalid');
      }

      const buffer = await this.encodeWithoutMetadata(
        pipeline,
        signatureFormat,
      );
      if (!buffer.length || buffer.length > MAX_PROPERTY_PHOTO_BYTES) {
        throw invalidPhoto('The processed photo must be 5 MB or smaller');
      }

      return {
        buffer,
        format: signatureFormat,
        mimeType: expectedMimeType,
        width: metadata.width,
        height: metadata.height,
        bytes: buffer.length,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw invalidPhoto('The file is not a safe, readable image');
    }
  }

  private encodeWithoutMetadata(
    pipeline: sharp.Sharp,
    format: PropertyPhotoFormat,
  ): Promise<Buffer> {
    switch (format) {
      case 'jpeg':
        return pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      case 'png':
        return pipeline.png({ compressionLevel: 9 }).toBuffer();
      case 'webp':
        return pipeline.webp({ quality: 88 }).toBuffer();
    }
  }
}
