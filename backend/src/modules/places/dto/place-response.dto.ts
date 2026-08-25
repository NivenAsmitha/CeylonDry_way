import { ApiProperty } from '@nestjs/swagger';
import { PropertyType } from '../../../generated/prisma/client.js';

export class PublicAmenityDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class PublicPhotoDto {
  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiProperty({ nullable: true })
  altText!: string | null;

  @ApiProperty()
  isCover!: boolean;
}

export class PublicOpeningHourDto {
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

export class PublicPlaceListItemDto {
  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: PropertyType })
  propertyType!: PropertyType;

  @ApiProperty({ nullable: true })
  shortDescription!: string | null;

  @ApiProperty()
  district!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  isFree!: boolean;

  @ApiProperty({ nullable: true })
  feeLkr!: number | null;

  @ApiProperty()
  wheelchairAccessible!: boolean;

  @ApiProperty({ type: [PublicAmenityDto] })
  amenities!: PublicAmenityDto[];

  @ApiProperty({ type: PublicPhotoDto, nullable: true })
  coverImage!: PublicPhotoDto | null;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiProperty({ nullable: true })
  distanceKm!: number | null;

  @ApiProperty({ example: true })
  verified!: true;
}

export class PublicPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PublicPlaceListResponseDto {
  @ApiProperty({ type: [PublicPlaceListItemDto] })
  items!: PublicPlaceListItemDto[];

  @ApiProperty({ type: PublicPaginationDto })
  pagination!: PublicPaginationDto;

  @ApiProperty({ type: [PublicAmenityDto] })
  availableAmenities!: PublicAmenityDto[];
}

export class PublicPlaceDetailsDto extends PublicPlaceListItemDto {
  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  address!: string;

  @ApiProperty({ nullable: true })
  accessNotes!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  website!: string | null;

  @ApiProperty({ type: [PublicOpeningHourDto] })
  openingHours!: PublicOpeningHourDto[];

  @ApiProperty({ type: [PublicPhotoDto] })
  photos!: PublicPhotoDto[];

  @ApiProperty({ format: 'uri' })
  directionsUrl!: string;
}
