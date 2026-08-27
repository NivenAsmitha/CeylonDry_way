import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  LocalPropertyPhotoFile,
  PropertyPhotoStorage,
  PropertyPhotoUploadContext,
  StoredPropertyPhoto,
} from './property-photo-storage';

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export class LocalPropertyPhotoStorage implements PropertyPhotoStorage {
  readonly providerName = 'local' as const;
  private readonly uploadDirectory: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const projectDirectory = path.resolve(process.cwd());
    const configuredDirectory = config.get<string>('PROPERTY_PHOTO_UPLOAD_DIR');
    this.uploadDirectory = path.resolve(
      projectDirectory,
      configuredDirectory || 'uploads/property-photos',
    );
    if (
      this.uploadDirectory !== projectDirectory &&
      !this.uploadDirectory.startsWith(`${projectDirectory}${path.sep}`)
    ) {
      throw new Error(
        'Local property-photo storage must remain inside backend',
      );
    }

    const configuredBaseUrl = config.get<string>('BACKEND_PUBLIC_URL');
    const port = config.get<number>('PORT') ?? 3000;
    this.publicBaseUrl = (
      configuredBaseUrl || `http://localhost:${port}`
    ).replace(/\/$/, '');
  }

  async uploadPropertyPhoto({
    propertyId,
    version,
    photo,
  }: PropertyPhotoUploadContext): Promise<StoredPropertyPhoto> {
    await mkdir(this.uploadDirectory, { recursive: true });
    const extension = photo.format === 'jpeg' ? 'jpg' : photo.format;
    const storageKey = `${propertyId}-${version}-${randomUUID()}.${extension}`;
    const destination = this.resolveStorageKey(storageKey);
    await writeFile(destination, photo.buffer, { flag: 'wx', mode: 0o600 });

    return {
      storageKey,
      url: `${this.publicBaseUrl}/api/v1/media/property-photos/${storageKey}`,
    };
  }

  async deletePropertyPhoto(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStorageKey(storageKey));
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    }
  }

  async readLocalPropertyPhoto(
    storageKey: string,
  ): Promise<LocalPropertyPhotoFile | null> {
    const extension = storageKey.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_BY_EXTENSION[extension];
    if (!mimeType) return null;

    try {
      return {
        buffer: await readFile(this.resolveStorageKey(storageKey)),
        mimeType,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }
      throw error;
    }
  }

  private resolveStorageKey(storageKey: string): string {
    if (
      !/^[0-9a-f-]{36}-\d+-[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(storageKey)
    ) {
      throw new Error('Invalid local property-photo storage key');
    }
    return path.join(this.uploadDirectory, storageKey);
  }
}
