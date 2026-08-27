import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { PropertyPhotoResponseDto } from '../properties/dto/property-response.dto';
import { isOwnerEditableStatus } from '../properties/properties.mapper';
import type { ReorderPropertyPhotosDto } from './dto/reorder-property-photos.dto';
import type { UpdatePropertyPhotoDto } from './dto/update-property-photo.dto';
import {
  MAX_PROPERTY_PHOTOS,
  PROPERTY_PHOTO_STORAGE,
} from './property-photo.constants';
import { PropertyPhotoImageService } from './property-photo-image.service';
import type {
  PropertyPhotoStorage,
  StoredPropertyPhoto,
} from './property-photo-storage';

const storedPhotoSelect = {
  id: true,
  propertyVersionId: true,
  url: true,
  storageKey: true,
  sortOrder: true,
  isCover: true,
  altText: true,
  createdAt: true,
} satisfies Prisma.PropertyPhotoSelect;

type StoredPhotoRecord = Prisma.PropertyPhotoGetPayload<{
  select: typeof storedPhotoSelect;
}>;
type DatabaseClient = PrismaService | Prisma.TransactionClient;

function mapSafePhoto(photo: StoredPhotoRecord): PropertyPhotoResponseDto {
  return {
    id: photo.id,
    url: photo.url,
    sortOrder: photo.sortOrder,
    isCover: photo.isCover,
    altText: photo.altText,
  };
}

function sortPhotos(photos: StoredPhotoRecord[]): StoredPhotoRecord[] {
  return [...photos].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

@Injectable()
export class PropertyPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: PropertyPhotoImageService,
    @Inject(PROPERTY_PHOTO_STORAGE)
    private readonly storage: PropertyPhotoStorage,
  ) {}

  async upload(
    ownerUserId: string,
    propertyId: string,
    files: Express.Multer.File[],
  ): Promise<PropertyPhotoResponseDto[]> {
    if (!files.length) {
      throw new BadRequestException({
        code: 'PROPERTY_PHOTO_REQUIRED',
        message: 'Select at least one photo',
        details: [{ field: 'photos', message: 'Select at least one photo' }],
      });
    }
    if (files.length > MAX_PROPERTY_PHOTOS) {
      throw this.photoLimitException();
    }

    const initialContext = await this.loadEditableContext(
      this.prisma,
      ownerUserId,
      propertyId,
    );
    if (initialContext.photos.length + files.length > MAX_PROPERTY_PHOTOS) {
      throw this.photoLimitException();
    }

    const validated = await Promise.all(
      files.map((file) => this.imageService.validateAndNormalize(file)),
    );
    const uploaded: StoredPropertyPhoto[] = [];

    try {
      for (const photo of validated) {
        uploaded.push(
          await this.storage.uploadPropertyPhoto({
            propertyId,
            version: initialContext.version,
            photo,
          }),
        );
      }
    } catch {
      await this.cleanupUploaded(uploaded);
      throw new ServiceUnavailableException({
        code: 'PROPERTY_PHOTO_STORAGE_FAILED',
        message: 'Photo storage is temporarily unavailable',
      });
    }

    try {
      const photos = await this.prisma.$transaction(
        async (transaction) => {
          const context = await this.loadEditableContext(
            transaction,
            ownerUserId,
            propertyId,
          );
          if (
            context.versionId !== initialContext.versionId ||
            context.photos.length + uploaded.length > MAX_PROPERTY_PHOTOS
          ) {
            throw this.photoLimitException();
          }

          const existing = sortPhotos(context.photos);
          await this.normalizeExistingPhotos(transaction, existing);
          const created: StoredPhotoRecord[] = [];
          for (const [index, stored] of uploaded.entries()) {
            created.push(
              await transaction.propertyPhoto.create({
                data: {
                  propertyVersionId: context.versionId,
                  url: stored.url,
                  storageKey: stored.storageKey,
                  sortOrder: existing.length + index,
                  isCover: existing.length === 0 && index === 0,
                },
                select: storedPhotoSelect,
              }),
            );
          }
          await this.touchProperty(transaction, ownerUserId, propertyId);
          return [...existing, ...created];
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return sortPhotos(photos).map(mapSafePhoto);
    } catch (error: unknown) {
      await this.cleanupUploaded(uploaded);
      throw error;
    }
  }

  async reorder(
    ownerUserId: string,
    propertyId: string,
    input: ReorderPropertyPhotosDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.prisma
      .$transaction(
        async (transaction) => {
          const context = await this.loadEditableContext(
            transaction,
            ownerUserId,
            propertyId,
          );
          const existingIds = new Set(context.photos.map((photo) => photo.id));
          const requestedIds = new Set(input.photoIds);
          if (
            requestedIds.size !== input.photoIds.length ||
            input.photoIds.length !== context.photos.length ||
            input.photoIds.some((id) => !existingIds.has(id))
          ) {
            throw new BadRequestException({
              code: 'PROPERTY_PHOTO_REORDER_INVALID',
              message: 'Reorder must include every current photo exactly once',
              details: [
                {
                  field: 'photoIds',
                  message:
                    'Photo IDs are missing or do not belong to this draft',
                },
              ],
            });
          }

          for (const [sortOrder, id] of input.photoIds.entries()) {
            await transaction.propertyPhoto.update({
              where: { id },
              data: { sortOrder },
            });
          }
          await this.touchProperty(transaction, ownerUserId, propertyId);
          const byId = new Map(
            context.photos.map((photo) => [photo.id, photo]),
          );
          return input.photoIds.map((id, sortOrder) => ({
            ...byId.get(id)!,
            sortOrder,
          }));
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then((photos) => photos.map(mapSafePhoto));
  }

  async setCover(
    ownerUserId: string,
    propertyId: string,
    photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.prisma
      .$transaction(
        async (transaction) => {
          const context = await this.loadEditableContext(
            transaction,
            ownerUserId,
            propertyId,
          );
          if (!context.photos.some((photo) => photo.id === photoId)) {
            throw new NotFoundException('Photo not found');
          }
          await transaction.propertyPhoto.updateMany({
            where: { propertyVersionId: context.versionId, isCover: true },
            data: { isCover: false },
          });
          await transaction.propertyPhoto.update({
            where: { id: photoId },
            data: { isCover: true },
          });
          await this.touchProperty(transaction, ownerUserId, propertyId);
          return sortPhotos(context.photos).map((photo) => ({
            ...photo,
            isCover: photo.id === photoId,
          }));
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then((photos) => photos.map(mapSafePhoto));
  }

  async updateAltText(
    ownerUserId: string,
    propertyId: string,
    photoId: string,
    input: UpdatePropertyPhotoDto,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.prisma
      .$transaction(async (transaction) => {
        const context = await this.loadEditableContext(
          transaction,
          ownerUserId,
          propertyId,
        );
        if (!context.photos.some((photo) => photo.id === photoId)) {
          throw new NotFoundException('Photo not found');
        }
        await transaction.propertyPhoto.update({
          where: { id: photoId },
          data: { altText: input.altText },
        });
        await this.touchProperty(transaction, ownerUserId, propertyId);
        return sortPhotos(context.photos).map((photo) => ({
          ...photo,
          altText: photo.id === photoId ? input.altText : photo.altText,
        }));
      })
      .then((photos) => photos.map(mapSafePhoto));
  }

  async remove(
    ownerUserId: string,
    propertyId: string,
    photoId: string,
  ): Promise<PropertyPhotoResponseDto[]> {
    const original = await this.prisma.$transaction(
      async (transaction) => {
        const context = await this.loadEditableContext(
          transaction,
          ownerUserId,
          propertyId,
        );
        const ordered = sortPhotos(context.photos);
        const removed = ordered.find((photo) => photo.id === photoId);
        if (!removed) throw new NotFoundException('Photo not found');
        const remaining = ordered.filter((photo) => photo.id !== photoId);

        await transaction.propertyPhoto.delete({ where: { id: photoId } });
        const coverId = removed.isCover
          ? remaining[0]?.id
          : remaining.find((photo) => photo.isCover)?.id;
        for (const [sortOrder, photo] of remaining.entries()) {
          await transaction.propertyPhoto.update({
            where: { id: photo.id },
            data: { sortOrder, isCover: photo.id === coverId },
          });
        }
        await this.touchProperty(transaction, ownerUserId, propertyId);
        return { removed, ordered, remaining, coverId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      await this.storage.deletePropertyPhoto(original.removed.storageKey);
    } catch {
      await this.restoreDeletedPhoto(original, ownerUserId, propertyId);
      throw new ServiceUnavailableException({
        code: 'PROPERTY_PHOTO_DELETE_FAILED',
        message: 'Photo could not be removed from storage; no change was kept',
      });
    }

    return original.remaining.map((photo, sortOrder) =>
      mapSafePhoto({
        ...photo,
        sortOrder,
        isCover: photo.id === original.coverId,
      }),
    );
  }

  private async loadEditableContext(
    database: DatabaseClient,
    ownerUserId: string,
    propertyId: string,
  ) {
    const property = await database.property.findFirst({
      where: { id: propertyId, ownerUserId },
      select: {
        id: true,
        lifecycleStatus: true,
        activeVersion: {
          select: {
            id: true,
            version: true,
            photos: { select: storedPhotoSelect },
          },
        },
      },
    });
    if (!property?.activeVersion) {
      throw new NotFoundException('Property not found');
    }
    if (!isOwnerEditableStatus(property.lifecycleStatus)) {
      throw new ConflictException(
        `Photos cannot be changed while the property is ${property.lifecycleStatus}`,
      );
    }
    return {
      versionId: property.activeVersion.id,
      version: property.activeVersion.version,
      photos: property.activeVersion.photos,
    };
  }

  private async normalizeExistingPhotos(
    transaction: Prisma.TransactionClient,
    photos: StoredPhotoRecord[],
  ): Promise<void> {
    const coverId =
      photos.find((photo) => photo.isCover)?.id ?? photos[0]?.id ?? null;
    for (const [sortOrder, photo] of photos.entries()) {
      if (
        photo.sortOrder !== sortOrder ||
        photo.isCover !== (photo.id === coverId)
      ) {
        await transaction.propertyPhoto.update({
          where: { id: photo.id },
          data: { sortOrder, isCover: photo.id === coverId },
        });
        photo.sortOrder = sortOrder;
        photo.isCover = photo.id === coverId;
      }
    }
  }

  private async touchProperty(
    transaction: Prisma.TransactionClient,
    ownerUserId: string,
    propertyId: string,
  ) {
    const updated = await transaction.property.updateMany({
      where: {
        id: propertyId,
        ownerUserId,
        lifecycleStatus: {
          in: [PropertyStatus.DRAFT, PropertyStatus.CHANGES_REQUESTED],
        },
      },
      data: { updatedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Property status changed during photo update',
      );
    }
  }

  private photoLimitException(): BadRequestException {
    return new BadRequestException({
      code: 'PROPERTY_PHOTO_LIMIT_EXCEEDED',
      message: `A property version may contain at most ${MAX_PROPERTY_PHOTOS} photos`,
      details: [
        {
          field: 'photos',
          message: `Keep no more than ${MAX_PROPERTY_PHOTOS} photos`,
        },
      ],
    });
  }

  private async cleanupUploaded(
    photos: readonly StoredPropertyPhoto[],
  ): Promise<void> {
    await Promise.allSettled(
      photos.map((photo) => this.storage.deletePropertyPhoto(photo.storageKey)),
    );
  }

  private async restoreDeletedPhoto(
    original: {
      removed: StoredPhotoRecord;
      ordered: StoredPhotoRecord[];
    },
    ownerUserId: string,
    propertyId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.loadEditableContext(transaction, ownerUserId, propertyId);
      await transaction.propertyPhoto.create({
        data: {
          id: original.removed.id,
          propertyVersionId: original.removed.propertyVersionId,
          url: original.removed.url,
          storageKey: original.removed.storageKey,
          sortOrder: original.removed.sortOrder,
          isCover: original.removed.isCover,
          altText: original.removed.altText,
          createdAt: original.removed.createdAt,
        },
      });
      for (const photo of original.ordered.filter(
        (photo) => photo.id !== original.removed.id,
      )) {
        await transaction.propertyPhoto.update({
          where: { id: photo.id },
          data: { sortOrder: photo.sortOrder, isCover: photo.isCover },
        });
      }
      await this.touchProperty(transaction, ownerUserId, propertyId);
    });
  }
}
