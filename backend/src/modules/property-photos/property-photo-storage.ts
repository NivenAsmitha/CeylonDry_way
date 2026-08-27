export type PropertyPhotoFormat = 'jpeg' | 'png' | 'webp';

export interface ValidatedPropertyPhoto {
  buffer: Buffer;
  format: PropertyPhotoFormat;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  bytes: number;
}

export interface StoredPropertyPhoto {
  url: string;
  storageKey: string;
}

export interface PropertyPhotoUploadContext {
  propertyId: string;
  version: number;
  photo: ValidatedPropertyPhoto;
}

export interface LocalPropertyPhotoFile {
  buffer: Buffer;
  mimeType: string;
}

export interface PropertyPhotoStorage {
  readonly providerName: 'cloudinary' | 'local';
  uploadPropertyPhoto(
    context: PropertyPhotoUploadContext,
  ): Promise<StoredPropertyPhoto>;
  deletePropertyPhoto(storageKey: string): Promise<void>;
  readLocalPropertyPhoto?(
    storageKey: string,
  ): Promise<LocalPropertyPhotoFile | null>;
}
