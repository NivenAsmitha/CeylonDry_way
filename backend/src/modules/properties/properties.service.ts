import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  PropertyStatus,
  RoleName,
  UserStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { MAX_PROPERTY_PHOTOS } from '../property-photos/property-photo.constants';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
  normalizeRoleSet,
} from '../roles/role-combination.policy';
import type {
  CreatePropertyDto,
  OpeningHourInputDto,
} from './dto/create-property.dto';
import type {
  AmenityResponseDto,
  OwnerPropertyListResponseDto,
  OwnerPropertyResponseDto,
} from './dto/property-response.dto';
import type { SubmitPropertyDto } from './dto/submit-property.dto';
import type { UpdatePropertyDto } from './dto/update-property.dto';
import {
  editablePropertyStatuses,
  isOwnerEditableStatus,
  mapOwnerProperty,
  ownerPropertySelect,
  type OwnerPropertyRecord,
} from './properties.mapper';

const OWNER_ASSIGNMENT_REASON = 'FIRST_PROPERTY_DRAFT';
const OWNER_LIST_LIMIT = 100;
const MINIMUM_SUBMISSION_DESCRIPTION_LENGTH = 50;
const MINIMUM_ACCESS_NOTES_LENGTH = 10;

interface ValidationIssue {
  field: string;
  message: string;
}

type PropertyDraftInput = CreatePropertyDto | UpdatePropertyDto;
type PropertyVersionDraftData = Partial<
  Pick<
    Prisma.PropertyVersionUncheckedCreateInput,
    | 'propertyType'
    | 'name'
    | 'organisation'
    | 'description'
    | 'accessNotes'
    | 'isFree'
    | 'feeLkr'
    | 'phone'
    | 'email'
    | 'website'
    | 'address'
    | 'district'
    | 'city'
    | 'latitude'
    | 'longitude'
  >
>;

function hasMeaningfulText(
  value: string | null | undefined,
  minimumLength = 1,
): boolean {
  return (value?.trim().length ?? 0) >= minimumLength;
}

function toDecimal(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value);
}

function createValidationException(
  code: string,
  message: string,
  details: ValidationIssue[],
): BadRequestException | UnprocessableEntityException {
  const response = { code, message, details };

  return code === 'PROPERTY_SUBMISSION_INVALID'
    ? new UnprocessableEntityException(response)
    : new BadRequestException(response);
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(
    userId: string,
    createPropertyDto: CreatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    this.assertOpeningHours(createPropertyDto.openingHours);

    const propertyId = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: {
          id: userId,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }

      const currentRoles = normalizeRoleSet(
        user.roles.map(({ role }) => role.name),
      );
      const mayCreateProperty =
        hasExactRoleSet(currentRoles, [RoleName.CLIENT]) ||
        hasExactRoleSet(currentRoles, [RoleName.CLIENT, RoleName.OWNER]);
      const assignsOwnerRole = hasExactRoleSet(currentRoles, [RoleName.CLIENT]);

      if (!mayCreateProperty) {
        throw new ForbiddenException(
          'Only client accounts can create property listings',
        );
      }

      assertAllowedRoleCombination([...currentRoles, RoleName.OWNER]);

      const ownerRole = await transaction.role.findUnique({
        where: { name: RoleName.OWNER },
        select: { id: true },
      });

      if (!ownerRole) {
        throw new ServiceUnavailableException(
          'The required OWNER role is not configured',
        );
      }

      const property = await transaction.property.create({
        data: {
          ownerUserId: userId,
          lifecycleStatus: PropertyStatus.DRAFT,
        },
        select: { id: true },
      });
      const versionData = this.buildVersionData(createPropertyDto);
      const version = await transaction.propertyVersion.create({
        data: {
          propertyId: property.id,
          version: 1,
          ...versionData,
        },
        select: { id: true },
      });
      const activated = await transaction.property.updateMany({
        where: {
          id: property.id,
          ownerUserId: userId,
          lifecycleStatus: PropertyStatus.DRAFT,
          activeVersionId: null,
        },
        data: { activeVersionId: version.id },
      });

      if (activated.count !== 1) {
        throw new ServiceUnavailableException(
          'Property draft could not be created',
        );
      }

      await this.syncRelatedDraftData(
        transaction,
        userId,
        property.id,
        version.id,
        createPropertyDto,
      );
      await transaction.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: ownerRole.id,
          },
        },
        create: {
          userId,
          roleId: ownerRole.id,
          systemReason: OWNER_ASSIGNMENT_REASON,
        },
        update: {},
      });
      if (assignsOwnerRole) {
        await transaction.auditLog.create({
          data: {
            actorId: userId,
            action: 'OWNER_ROLE_ASSIGNED',
            targetType: 'User',
            targetId: userId,
            beforeSummary: { roles: currentRoles },
            afterSummary: {
              roles: normalizeRoleSet([...currentRoles, RoleName.OWNER]),
              reason: OWNER_ASSIGNMENT_REASON,
            },
          },
        });
      }

      return property.id;
    });

    return this.getOwnedProperty(userId, propertyId);
  }

  async createReviewerDraft(
    reviewerId: string,
    createPropertyDto: CreatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    this.assertOpeningHours(createPropertyDto.openingHours);

    const propertyId = await this.prisma.$transaction(async (transaction) => {
      const reviewer = await transaction.user.findFirst({
        where: {
          id: reviewerId,
          status: UserStatus.ACTIVE,
          deletedAt: null,
          roles: { some: { role: { name: RoleName.REVIEWER } } },
        },
        select: { id: true },
      });
      if (!reviewer) {
        throw new ForbiddenException('Active reviewer access is required');
      }

      const property = await transaction.property.create({
        data: {
          ownerUserId: reviewerId,
          lifecycleStatus: PropertyStatus.DRAFT,
        },
        select: { id: true },
      });
      const version = await transaction.propertyVersion.create({
        data: {
          propertyId: property.id,
          version: 1,
          ...this.buildVersionData(createPropertyDto),
        },
        select: { id: true },
      });
      await transaction.property.update({
        where: { id: property.id },
        data: { activeVersionId: version.id },
      });
      await this.syncRelatedDraftData(
        transaction,
        reviewerId,
        property.id,
        version.id,
        createPropertyDto,
      );
      await transaction.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'REVIEWER_PROPERTY_DRAFT_CREATED',
          targetType: 'PROPERTY',
          targetId: property.id,
          afterSummary: {
            lifecycleStatus: PropertyStatus.DRAFT,
            propertyVersionId: version.id,
          },
        },
      });
      return property.id;
    });

    return this.getOwnedProperty(reviewerId, propertyId);
  }

  async listOwnedProperties(
    userId: string,
  ): Promise<OwnerPropertyListResponseDto> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where: { ownerUserId: userId },
        orderBy: { updatedAt: 'desc' },
        take: OWNER_LIST_LIMIT,
        select: ownerPropertySelect,
      }),
      this.prisma.property.count({ where: { ownerUserId: userId } }),
    ]);

    return {
      items: records.map(mapOwnerProperty),
      total,
    };
  }

  async getOwnedProperty(
    userId: string,
    propertyId: string,
  ): Promise<OwnerPropertyResponseDto> {
    const property = await this.findOwnedProperty(userId, propertyId);

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    try {
      return mapOwnerProperty(property);
    } catch {
      throw new ServiceUnavailableException('Property draft is unavailable');
    }
  }

  async updateOwnedProperty(
    userId: string,
    propertyId: string,
    updatePropertyDto: UpdatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    this.assertOpeningHours(updatePropertyDto.openingHours);

    await this.prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findFirst({
        where: { id: propertyId, ownerUserId: userId },
        select: {
          id: true,
          lifecycleStatus: true,
          activeVersionId: true,
        },
      });

      if (!property || !property.activeVersionId) {
        throw new NotFoundException('Property not found');
      }

      if (!isOwnerEditableStatus(property.lifecycleStatus)) {
        throw new ConflictException(
          `Properties with status ${property.lifecycleStatus} cannot be edited`,
        );
      }

      const versionData = this.buildVersionData(updatePropertyDto);

      if (Object.keys(versionData).length > 0) {
        const updatedVersion = await transaction.propertyVersion.updateMany({
          where: {
            id: property.activeVersionId,
            property: { id: propertyId, ownerUserId: userId },
          },
          data: versionData,
        });

        if (updatedVersion.count !== 1) {
          throw new NotFoundException('Property not found');
        }
      }

      await this.syncRelatedDraftData(
        transaction,
        userId,
        propertyId,
        property.activeVersionId,
        updatePropertyDto,
      );
      const touchedProperty = await transaction.property.updateMany({
        where: {
          id: propertyId,
          ownerUserId: userId,
          lifecycleStatus: property.lifecycleStatus,
        },
        data: { updatedAt: new Date() },
      });

      if (touchedProperty.count !== 1) {
        throw new ConflictException('Property status changed during update');
      }
    });

    return this.getOwnedProperty(userId, propertyId);
  }

  async submitOwnedProperty(
    userId: string,
    propertyId: string,
    submitPropertyDto: SubmitPropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    if (!submitPropertyDto.confirm) {
      throw new BadRequestException('Submission confirmation is required');
    }

    await this.prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findFirst({
        where: { id: propertyId, ownerUserId: userId },
        select: ownerPropertySelect,
      });

      if (!property || !property.activeVersion) {
        throw new NotFoundException('Property not found');
      }

      if (!isOwnerEditableStatus(property.lifecycleStatus)) {
        throw new ConflictException(
          `Properties with status ${property.lifecycleStatus} cannot be submitted`,
        );
      }

      const issues = this.getSubmissionIssues(property);

      if (issues.length > 0) {
        throw createValidationException(
          'PROPERTY_SUBMISSION_INVALID',
          'Property is incomplete or invalid',
          issues,
        );
      }

      const submittedAt = new Date();
      const updatedVersion = await transaction.propertyVersion.updateMany({
        where: {
          id: property.activeVersion.id,
          property: { id: propertyId, ownerUserId: userId },
        },
        data: { submittedAt },
      });
      const updatedProperty = await transaction.property.updateMany({
        where: {
          id: propertyId,
          ownerUserId: userId,
          lifecycleStatus: { in: [...editablePropertyStatuses] },
        },
        data: {
          lifecycleStatus: PropertyStatus.PENDING,
          updatedAt: submittedAt,
        },
      });

      if (updatedVersion.count !== 1 || updatedProperty.count !== 1) {
        throw new ConflictException(
          'Property status changed during submission',
        );
      }
    });

    return this.getOwnedProperty(userId, propertyId);
  }

  async listActiveAmenities(): Promise<AmenityResponseDto[]> {
    return this.prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
      },
    });
  }

  private findOwnedProperty(
    userId: string,
    propertyId: string,
  ): Promise<OwnerPropertyRecord | null> {
    return this.prisma.property.findFirst({
      where: { id: propertyId, ownerUserId: userId },
      select: ownerPropertySelect,
    });
  }

  private buildVersionData(
    input: PropertyDraftInput,
  ): PropertyVersionDraftData {
    const data: PropertyVersionDraftData = {};

    if (input.propertyType !== undefined) {
      data.propertyType = input.propertyType;
    }
    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.organisation !== undefined) {
      data.organisation = input.organisation;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.accessNotes !== undefined) {
      data.accessNotes = input.accessNotes;
    }
    if (input.phone !== undefined) {
      data.phone = input.phone;
    }
    if (input.email !== undefined) {
      data.email = input.email;
    }
    if (input.website !== undefined) {
      data.website = input.website;
    }
    if (input.address !== undefined) {
      data.address = input.address;
    }
    if (input.district !== undefined) {
      data.district = input.district;
    }
    if (input.city !== undefined) {
      data.city = input.city;
    }
    if (input.latitude !== undefined) {
      data.latitude =
        input.latitude === null ? null : new Prisma.Decimal(input.latitude);
    }
    if (input.longitude !== undefined) {
      data.longitude =
        input.longitude === null ? null : new Prisma.Decimal(input.longitude);
    }

    if (input.isFree !== undefined) {
      data.isFree = input.isFree;

      if (input.isFree) {
        data.feeLkr = null;
      }
    }

    if (input.feeLkr !== undefined && input.isFree !== true) {
      data.feeLkr = toDecimal(input.feeLkr);
    }

    return data;
  }

  private assertOpeningHours(
    openingHours: OpeningHourInputDto[] | undefined,
  ): void {
    if (openingHours === undefined) {
      return;
    }

    const issues: ValidationIssue[] = [];
    const weekdays = new Set<number>();

    for (const openingHour of openingHours) {
      const field = `openingHours.${openingHour.weekday}`;

      if (weekdays.has(openingHour.weekday)) {
        issues.push({
          field: 'openingHours',
          message: 'Each weekday can appear only once',
        });
      }
      weekdays.add(openingHour.weekday);

      if (openingHour.isClosed && openingHour.is24Hours) {
        issues.push({
          field,
          message: 'A day cannot be both closed and open 24 hours',
        });
      }

      if (
        (openingHour.isClosed || openingHour.is24Hours) &&
        (openingHour.openTime || openingHour.closeTime)
      ) {
        issues.push({
          field,
          message: 'Closed and 24-hour days cannot include opening times',
        });
      }

      if (
        !openingHour.isClosed &&
        !openingHour.is24Hours &&
        openingHour.openTime &&
        openingHour.closeTime &&
        openingHour.openTime >= openingHour.closeTime
      ) {
        issues.push({
          field,
          message: 'Closing time must be later than opening time',
        });
      }
    }

    if (issues.length > 0) {
      throw createValidationException(
        'PROPERTY_INPUT_INVALID',
        'Property input is invalid',
        issues,
      );
    }
  }

  private async syncRelatedDraftData(
    transaction: Prisma.TransactionClient,
    userId: string,
    propertyId: string,
    propertyVersionId: string,
    input: PropertyDraftInput,
  ): Promise<void> {
    if (input.amenityCodes !== undefined) {
      const amenities = await transaction.amenity.findMany({
        where: {
          code: { in: input.amenityCodes },
          isActive: true,
        },
        select: { id: true, code: true },
      });

      if (amenities.length !== input.amenityCodes.length) {
        throw createValidationException(
          'PROPERTY_INPUT_INVALID',
          'Property input is invalid',
          [
            {
              field: 'amenityCodes',
              message: 'Every amenity must be active and recognized',
            },
          ],
        );
      }

      await transaction.propertyAmenity.deleteMany({
        where: {
          propertyVersionId,
          propertyVersion: {
            property: { id: propertyId, ownerUserId: userId },
          },
        },
      });

      if (amenities.length > 0) {
        await transaction.propertyAmenity.createMany({
          data: amenities.map((amenity) => ({
            propertyVersionId,
            amenityId: amenity.id,
          })),
        });
      }
    }

    if (input.openingHours !== undefined) {
      await transaction.openingHour.deleteMany({
        where: {
          propertyVersionId,
          propertyVersion: {
            property: { id: propertyId, ownerUserId: userId },
          },
        },
      });

      if (input.openingHours.length > 0) {
        await transaction.openingHour.createMany({
          data: input.openingHours.map((openingHour) => ({
            propertyVersionId,
            weekday: openingHour.weekday,
            isClosed: openingHour.isClosed,
            is24Hours: openingHour.is24Hours,
            openTime:
              openingHour.isClosed || openingHour.is24Hours
                ? null
                : openingHour.openTime,
            closeTime:
              openingHour.isClosed || openingHour.is24Hours
                ? null
                : openingHour.closeTime,
          })),
        });
      }
    }
  }

  private getSubmissionIssues(
    property: OwnerPropertyRecord,
  ): ValidationIssue[] {
    const version = property.activeVersion;

    if (!version) {
      return [
        { field: 'activeVersion', message: 'An active draft is required' },
      ];
    }

    const issues: ValidationIssue[] = [];
    const latitude = version.latitude?.toNumber();
    const longitude = version.longitude?.toNumber();

    if (!hasMeaningfulText(version.name, 2)) {
      issues.push({ field: 'name', message: 'Property name is required' });
    }
    if (!version.propertyType) {
      issues.push({
        field: 'propertyType',
        message: 'Property type is required',
      });
    }
    if (
      !hasMeaningfulText(
        version.description,
        MINIMUM_SUBMISSION_DESCRIPTION_LENGTH,
      )
    ) {
      issues.push({
        field: 'description',
        message: `Description must contain at least ${MINIMUM_SUBMISSION_DESCRIPTION_LENGTH} characters`,
      });
    }
    if (!version.isFree && (version.feeLkr?.toNumber() ?? 0) <= 0) {
      issues.push({
        field: 'feeLkr',
        message: 'A positive LKR fee is required for paid properties',
      });
    }
    if (!hasMeaningfulText(version.address)) {
      issues.push({ field: 'address', message: 'Address is required' });
    }
    if (!hasMeaningfulText(version.district, 2)) {
      issues.push({ field: 'district', message: 'District is required' });
    }
    if (!hasMeaningfulText(version.city, 2)) {
      issues.push({ field: 'city', message: 'City is required' });
    }
    if (latitude === undefined || latitude < -90 || latitude > 90) {
      issues.push({ field: 'latitude', message: 'Valid latitude is required' });
    }
    if (longitude === undefined || longitude < -180 || longitude > 180) {
      issues.push({
        field: 'longitude',
        message: 'Valid longitude is required',
      });
    }
    if (
      !hasMeaningfulText(version.accessNotes, MINIMUM_ACCESS_NOTES_LENGTH) &&
      version.openingHours.length === 0
    ) {
      issues.push({
        field: 'accessNotes',
        message: 'Access notes or opening hours are required',
      });
    }
    if (
      version.amenities.filter((selection) => selection.amenity.isActive)
        .length === 0
    ) {
      issues.push({
        field: 'amenityCodes',
        message: 'Select at least one active amenity',
      });
    }
    if (version.photos.length < 1) {
      issues.push({
        field: 'photos',
        message: 'Add at least one property photo',
      });
    } else {
      if (version.photos.length > MAX_PROPERTY_PHOTOS) {
        issues.push({
          field: 'photos',
          message: `Keep no more than ${MAX_PROPERTY_PHOTOS} photos`,
        });
      }
      if (version.photos.filter((photo) => photo.isCover).length !== 1) {
        issues.push({
          field: 'photos',
          message: 'Exactly one photo must be the cover',
        });
      }
      const sortOrders = version.photos.map((photo) => photo.sortOrder);
      if (new Set(sortOrders).size !== sortOrders.length) {
        issues.push({
          field: 'photos',
          message: 'Photo order must be unique',
        });
      }
    }

    return issues;
  }
}
