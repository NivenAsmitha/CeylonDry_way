import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { LocalPropertyPhotoStorage } from './local-property-photo-storage';

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';

describe('LocalPropertyPhotoStorage', () => {
  const relativeDirectory = path.join(
    'uploads',
    'property-photo-tests',
    randomUUID(),
  );
  const absoluteDirectory = path.resolve(process.cwd(), relativeDirectory);
  const config = new ConfigService({
    PROPERTY_PHOTO_UPLOAD_DIR: relativeDirectory,
    BACKEND_PUBLIC_URL: 'http://localhost:3000',
  });
  const storage = new LocalPropertyPhotoStorage(config);

  afterAll(async () => {
    await rm(absoluteDirectory, { recursive: true, force: true });
  });

  it('writes, reads, and deletes only server-generated scoped image keys', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const stored = await storage.uploadPropertyPhoto({
      propertyId: PROPERTY_ID,
      version: 2,
      photo: {
        buffer,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        width: 1,
        height: 1,
        bytes: buffer.length,
      },
    });

    expect(stored.storageKey).toMatch(
      new RegExp(`^${PROPERTY_ID}-2-[0-9a-f-]{36}\\.jpg$`, 'i'),
    );
    expect(stored.url).toBe(
      `http://localhost:3000/api/v1/media/property-photos/${stored.storageKey}`,
    );
    await expect(
      storage.readLocalPropertyPhoto(stored.storageKey),
    ).resolves.toEqual({
      buffer,
      mimeType: 'image/jpeg',
    });

    await storage.deletePropertyPhoto(stored.storageKey);
    await expect(
      storage.readLocalPropertyPhoto(stored.storageKey),
    ).resolves.toBeNull();
  });

  it('rejects traversal and arbitrary local paths', async () => {
    await expect(
      storage.readLocalPropertyPhoto('../outside.jpg'),
    ).rejects.toThrow('Invalid local property-photo storage key');
  });
});
