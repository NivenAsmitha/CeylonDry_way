import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { MAX_PROPERTY_PHOTO_BYTES } from './property-photo.constants';
import { PropertyPhotoImageService } from './property-photo-image.service';

function file(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    buffer,
    mimetype,
    originalname: 'fixture',
    fieldname: 'photos',
    encoding: '7bit',
    size: buffer.length,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('PropertyPhotoImageService', () => {
  const service = new PropertyPhotoImageService();

  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ] as const)(
    'accepts and normalizes a genuine %s image',
    async (format, mime) => {
      const buffer = await sharp({
        create: {
          width: 8,
          height: 6,
          channels: 3,
          background: '#197a5b',
        },
      })
        .toFormat(format)
        .toBuffer();

      const result = await service.validateAndNormalize(file(buffer, mime));

      expect(result).toMatchObject({
        format,
        mimeType: mime,
        width: 8,
        height: 6,
      });
      expect(result.buffer.length).toBeGreaterThan(0);
    },
  );

  it('rejects zero-byte, oversized, fake, and MIME-mismatched files', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer();

    for (const invalidFile of [
      file(Buffer.alloc(0), 'image/png'),
      file(Buffer.alloc(MAX_PROPERTY_PHOTO_BYTES + 1, 0xff), 'image/jpeg'),
      file(Buffer.from('not an image'), 'image/jpeg'),
      file(png, 'image/jpeg'),
    ]) {
      await expect(
        service.validateAndNormalize(invalidFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
