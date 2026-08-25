import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyStatus,
  PropertyType,
  ReviewDecisionType,
} from '../../../generated/prisma/client.js';
import {
  OpeningHourResponseDto,
  PropertyPhotoResponseDto,
  SelectedAmenityResponseDto,
} from '../../properties/dto/property-response.dto';
import { ReviewFieldNoteDto } from './review-decision.dto';

export class ReviewerOwnerSummaryDto {
  @ApiProperty()
  name!: string;
}

export class ReviewerQueueItemDto {
  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiProperty({ format: 'uuid' })
  propertyVersionId!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ enum: PropertyType, nullable: true })
  propertyType!: PropertyType | null;

  @ApiProperty({ nullable: true })
  district!: string | null;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty({ enum: PropertyStatus })
  lifecycleStatus!: PropertyStatus;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ type: ReviewerOwnerSummaryDto })
  owner!: ReviewerOwnerSummaryDto;
}

export class PaginationMetadataDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ReviewerQueueResponseDto {
  @ApiProperty({ type: [ReviewerQueueItemDto] })
  items!: ReviewerQueueItemDto[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination!: PaginationMetadataDto;
}

export class ReviewDecisionHistoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ReviewDecisionType })
  decision!: ReviewDecisionType;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ type: [ReviewFieldNoteDto], nullable: true })
  fieldNotes!: ReviewFieldNoteDto[] | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ReviewerOwnerSummaryDto })
  reviewer!: ReviewerOwnerSummaryDto;
}

export class ReviewerSubmittedVersionDto {
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

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ type: [SelectedAmenityResponseDto] })
  amenities!: SelectedAmenityResponseDto[];

  @ApiProperty({ type: [OpeningHourResponseDto] })
  openingHours!: OpeningHourResponseDto[];

  @ApiProperty({ type: [PropertyPhotoResponseDto] })
  photos!: PropertyPhotoResponseDto[];
}

export class ReviewerListingDetailDto {
  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiProperty({ enum: PropertyStatus })
  lifecycleStatus!: PropertyStatus;

  @ApiProperty({ type: ReviewerOwnerSummaryDto })
  owner!: ReviewerOwnerSummaryDto;

  @ApiProperty({ type: ReviewerSubmittedVersionDto })
  submittedVersion!: ReviewerSubmittedVersionDto;

  @ApiProperty({ enum: ReviewDecisionType, isArray: true })
  allowedDecisions!: ReviewDecisionType[];

  @ApiProperty({ type: [ReviewDecisionHistoryDto] })
  decisionHistory!: ReviewDecisionHistoryDto[];
}
