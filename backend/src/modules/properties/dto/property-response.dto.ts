import { ApiProperty } from '@nestjs/swagger';
import {
  PropertyStatus,
  PropertyType,
  ReviewDecisionType,
} from '../../../generated/prisma/client.js';

export class AmenityResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}

export class SelectedAmenityResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  notes!: string | null;
}

export class OpeningHourResponseDto {
  @ApiProperty({ minimum: 0, maximum: 6 })
  weekday!: number;

  @ApiProperty({ nullable: true })
  openTime!: string | null;

  @ApiProperty({ nullable: true })
  closeTime!: string | null;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  is24Hours!: boolean;
}

export class PropertyPhotoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isCover!: boolean;

  @ApiProperty({ nullable: true })
  altText!: string | null;
}

export class PropertyVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ enum: PropertyType, nullable: true })
  propertyType!: PropertyType | null;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  organisation!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  accessNotes!: string | null;

  @ApiProperty()
  isFree!: boolean;

  @ApiProperty({ nullable: true })
  feeLkr!: number | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  website!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  district!: string | null;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty({ nullable: true })
  latitude!: number | null;

  @ApiProperty({ nullable: true })
  longitude!: number | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ type: [SelectedAmenityResponseDto] })
  amenities!: SelectedAmenityResponseDto[];

  @ApiProperty({ type: [OpeningHourResponseDto] })
  openingHours!: OpeningHourResponseDto[];

  @ApiProperty({ type: [PropertyPhotoResponseDto] })
  photos!: PropertyPhotoResponseDto[];
}

export class LatestReviewDecisionResponseDto {
  @ApiProperty({ enum: ReviewDecisionType })
  decision!: ReviewDecisionType;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class OwnerPropertyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PropertyStatus })
  lifecycleStatus!: PropertyStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty()
  canEdit!: boolean;

  @ApiProperty()
  canSubmit!: boolean;

  @ApiProperty()
  canStartRevision!: boolean;

  @ApiProperty({ type: LatestReviewDecisionResponseDto, nullable: true })
  latestDecision!: LatestReviewDecisionResponseDto | null;

  @ApiProperty({ type: PropertyVersionResponseDto })
  activeVersion!: PropertyVersionResponseDto;
}

export class OwnerPropertyListResponseDto {
  @ApiProperty({ type: [OwnerPropertyResponseDto] })
  items!: OwnerPropertyResponseDto[];

  @ApiProperty()
  total!: number;
}
