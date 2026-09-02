import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PropertyStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyPhotoImageService } from './property-photo-image.service';
import type { PropertyPhotoStorage } from './property-photo-storage';
import { PropertyPhotosService } from './property-photos.service';

const OWNER_ID = 'owner-a';
const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const PHOTO_ONE = '33333333-3333-4333-8333-333333333333';
const PHOTO_TWO = '44444444-4444-4444-8444-444444444444';
const NOW = new Date('2026-08-26T00:00:00.000Z');

function multerFile(): Express.Multer.File {
  const buffer = Buffer.from('validated-by-mock');
  return {
    buffer,
    mimetype: 'image/jpeg',
    originalname: 'photo.jpg',
    fieldname: 'photos',
    encoding: '7bit',
    size: buffer.length,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function photo(id: string, sortOrder: number, isCover = false) {
  return {
    id,
    propertyVersionId: VERSION_ID,
    url: `http://localhost:3000/api/v1/media/property-photos/${id}.jpg`,
    storageKey: `${id}.jpg`,
    sortOrder,
    isCover,
    altText: null,
    createdAt: NOW,
  };
}

type PhotoRecord = ReturnType<typeof photo>;
type PhotoCreateData = Omit<PhotoRecord, 'id' | 'createdAt' | 'altText'> & {
  id?: string;
  createdAt?: Date;
  altText?: null;
};
type PhotoMutation = {
  where: { id: string };
  data: Partial<PhotoRecord>;
};

describe('PropertyPhotosService', () => {
  function fixture(
    status: PropertyStatus = PropertyStatus.DRAFT,
    existingPhotos = [] as PhotoRecord[],
  ) {
    let currentStatus = status;
    let currentPhotos = [...existingPhotos];
    const propertyFindFirst = jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: PROPERTY_ID,
        lifecycleStatus: currentStatus,
        activeVersionId:
          currentStatus === PropertyStatus.APPROVED ? VERSION_ID : null,
        workingVersionId: VERSION_ID,
        workingVersion: {
          id: VERSION_ID,
          version: 1,
          photos: currentPhotos,
        },
      }),
    );
    const propertyPhotoCreate = jest
      .fn()
      .mockImplementation(({ data }: { data: PhotoCreateData }) => {
        const created: PhotoRecord = {
          ...data,
          id:
            data.id ??
            `55555555-5555-4555-8555-${String(currentPhotos.length + 1).padStart(12, '0')}`,
          altText: data.altText ?? null,
          createdAt: data.createdAt ?? NOW,
        };
        currentPhotos.push(created);
        return Promise.resolve(created);
      });
    const propertyPhotoUpdate = jest
      .fn()
      .mockImplementation(({ where, data }: PhotoMutation) => {
        currentPhotos = currentPhotos.map((item) =>
          item.id === where.id ? { ...item, ...data } : item,
        );
        return Promise.resolve(
          currentPhotos.find((item) => item.id === where.id),
        );
      });
    const propertyPhotoUpdateMany = jest
      .fn()
      .mockImplementation(({ data }: { data: Partial<PhotoRecord> }) => {
        currentPhotos = currentPhotos.map((item) => ({ ...item, ...data }));
        return Promise.resolve({ count: currentPhotos.length });
      });
    const propertyPhotoDelete = jest
      .fn()
      .mockImplementation(({ where }: { where: { id: string } }) => {
        const removed = currentPhotos.find((item) => item.id === where.id);
        currentPhotos = currentPhotos.filter((item) => item.id !== where.id);
        return Promise.resolve(removed);
      });
    const propertyPhotoCount = jest.fn().mockResolvedValue(0);
    const transaction = {
      property: {
        findFirst: propertyFindFirst,
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      propertyPhoto: {
        create: propertyPhotoCreate,
        update: propertyPhotoUpdate,
        updateMany: propertyPhotoUpdateMany,
        delete: propertyPhotoDelete,
        count: propertyPhotoCount,
      },
    };
    const prisma = {
      property: { findFirst: propertyFindFirst },
      propertyPhoto: { count: propertyPhotoCount },
      $transaction: jest.fn((work: (client: typeof transaction) => unknown) =>
        work(transaction),
      ),
    } as unknown as PrismaService;
    const validateAndNormalize = jest.fn().mockResolvedValue({
      buffer: Buffer.from('normalized'),
      format: 'jpeg',
      mimeType: 'image/jpeg',
      width: 10,
      height: 10,
      bytes: 10,
    });
    const imageService = {
      validateAndNormalize,
    } as unknown as PropertyPhotoImageService;
    const uploadPropertyPhoto = jest.fn().mockResolvedValue({
      url: 'http://localhost:3000/api/v1/media/property-photos/stored.jpg',
      storageKey: 'stored.jpg',
    });
    const deletePropertyPhoto = jest.fn().mockResolvedValue(undefined);
    const storage = {
      providerName: 'local',
      uploadPropertyPhoto,
      deletePropertyPhoto,
    } as PropertyPhotoStorage;

    return {
      service: new PropertyPhotosService(prisma, imageService, storage),
      transaction,
      propertyFindFirst,
      propertyPhotoCreate,
      propertyPhotoUpdate,
      propertyPhotoUpdateMany,
      propertyPhotoDelete,
      propertyPhotoCount,
      uploadPropertyPhoto,
      deletePropertyPhoto,
      setStatus: (next: PropertyStatus) => {
        currentStatus = next;
      },
      setPhotos: (next: PhotoRecord[]) => {
        currentPhotos = next;
      },
      getPhotos: (): PhotoRecord[] => [...currentPhotos],
    };
  }

  it.each([PropertyStatus.DRAFT, PropertyStatus.CHANGES_REQUESTED])(
    'uploads to an owned editable %s version and makes the first photo cover',
    async (status) => {
      const test = fixture(status);
      const result = await test.service.upload(OWNER_ID, PROPERTY_ID, [
        multerFile(),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ sortOrder: 0, isCover: true });
      expect(result[0]).not.toHaveProperty('storageKey');
      expect(test.uploadPropertyPhoto).toHaveBeenCalledWith(
        expect.objectContaining({ propertyId: PROPERTY_ID, version: 1 }),
      );
    },
  );

  it('does not disclose or mutate another owner property', async () => {
    const test = fixture();
    test.propertyFindFirst.mockResolvedValue(null);

    await expect(
      test.service.upload('owner-b', PROPERTY_ID, [multerFile()]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(test.uploadPropertyPhoto).not.toHaveBeenCalled();
  });

  it.each([
    PropertyStatus.PENDING,
    PropertyStatus.APPROVED,
    PropertyStatus.PENDING_UPDATE,
    PropertyStatus.REJECTED,
    PropertyStatus.SUSPENDED,
    PropertyStatus.ARCHIVED,
  ])('rejects photo changes while the property is %s', async (status) => {
    const test = fixture(status);
    await expect(
      test.service.upload(OWNER_ID, PROPERTY_ID, [multerFile()]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(test.uploadPropertyPhoto).not.toHaveBeenCalled();
  });

  it('enforces four total photos across repeated requests', async () => {
    const test = fixture(PropertyStatus.DRAFT, [
      photo(PHOTO_ONE, 0, true),
      photo(PHOTO_TWO, 1),
      photo('55555555-5555-4555-8555-555555555555', 2),
      photo('66666666-6666-4666-8666-666666666666', 3),
    ]);
    await expect(
      test.service.upload(OWNER_ID, PROPERTY_ID, [multerFile()]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(test.uploadPropertyPhoto).not.toHaveBeenCalled();
  });

  it('cleans up uploaded storage objects when database creation fails', async () => {
    const test = fixture();
    test.propertyPhotoCreate.mockRejectedValueOnce(
      new Error('database failed'),
    );

    await expect(
      test.service.upload(OWNER_ID, PROPERTY_ID, [multerFile()]),
    ).rejects.toThrow('database failed');
    expect(test.deletePropertyPhoto).toHaveBeenCalledWith('stored.jpg');
  });

  it('does not create database rows when external storage fails', async () => {
    const test = fixture();
    test.uploadPropertyPhoto.mockRejectedValueOnce(new Error('storage failed'));

    await expect(
      test.service.upload(OWNER_ID, PROPERTY_ID, [multerFile()]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(test.propertyPhotoCreate).not.toHaveBeenCalled();
  });

  it('atomically leaves exactly one cover photo', async () => {
    const test = fixture(PropertyStatus.DRAFT, [
      photo(PHOTO_ONE, 0, true),
      photo(PHOTO_TWO, 1),
    ]);
    const result = await test.service.setCover(
      OWNER_ID,
      PROPERTY_ID,
      PHOTO_TWO,
    );

    expect(result.filter((item) => item.isCover)).toEqual([
      expect.objectContaining({ id: PHOTO_TWO }),
    ]);
    expect(test.propertyPhotoUpdateMany).toHaveBeenCalledWith({
      where: { propertyVersionId: VERSION_ID, isCover: true },
      data: { isCover: false },
    });
  });

  it('deleting the cover promotes and reorders the first remaining photo', async () => {
    const test = fixture(PropertyStatus.DRAFT, [
      photo(PHOTO_ONE, 0, true),
      photo(PHOTO_TWO, 1),
    ]);
    const result = await test.service.remove(OWNER_ID, PROPERTY_ID, PHOTO_ONE);

    expect(result).toEqual([
      expect.objectContaining({ id: PHOTO_TWO, sortOrder: 0, isCover: true }),
    ]);
    expect(test.deletePropertyPhoto).toHaveBeenCalledWith(`${PHOTO_ONE}.jpg`);
  });

  it('restores database metadata when provider deletion fails', async () => {
    const test = fixture(PropertyStatus.DRAFT, [photo(PHOTO_ONE, 0, true)]);
    test.deletePropertyPhoto.mockRejectedValueOnce(
      new Error('provider failed'),
    );

    await expect(
      test.service.remove(OWNER_ID, PROPERTY_ID, PHOTO_ONE),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(test.getPhotos()).toEqual([
      expect.objectContaining({
        id: PHOTO_ONE,
        storageKey: `${PHOTO_ONE}.jpg`,
      }),
    ]);
  });

  it.each([
    [PHOTO_ONE, PHOTO_ONE],
    [PHOTO_ONE, '77777777-7777-4777-8777-777777777777'],
  ])('rejects duplicate, missing, or foreign reorder IDs', async (...ids) => {
    const test = fixture(PropertyStatus.DRAFT, [
      photo(PHOTO_ONE, 0, true),
      photo(PHOTO_TWO, 1),
    ]);

    await expect(
      test.service.reorder(OWNER_ID, PROPERTY_ID, { photoIds: ids }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(test.propertyPhotoUpdate).not.toHaveBeenCalled();
  });

  it('reorders every photo contiguously without changing the cover', async () => {
    const test = fixture(PropertyStatus.DRAFT, [
      photo(PHOTO_ONE, 0, true),
      photo(PHOTO_TWO, 1),
    ]);
    const result = await test.service.reorder(OWNER_ID, PROPERTY_ID, {
      photoIds: [PHOTO_TWO, PHOTO_ONE],
    });

    expect(
      result.map(({ id, sortOrder, isCover }) => ({ id, sortOrder, isCover })),
    ).toEqual([
      { id: PHOTO_TWO, sortOrder: 0, isCover: false },
      { id: PHOTO_ONE, sortOrder: 1, isCover: true },
    ]);
  });
});
