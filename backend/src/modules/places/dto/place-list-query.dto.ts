import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { PropertyType } from '../../../generated/prisma/client.js';

const AMENITY_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;

export const placeSortValues = [
  'newest',
  'name_asc',
  'name_desc',
  'city_asc',
  'distance',
] as const;

export type PlaceSort = (typeof placeSortValues)[number];

function parseBooleanQuery(params: TransformFnParams): unknown {
  const value: unknown = params.value;

  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

function parseAmenityCodes(params: TransformFnParams): unknown {
  const value: unknown = params.value;

  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

export class PlaceListQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(parseBooleanQuery)
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(parseBooleanQuery)
  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;

  @ApiPropertyOptional({
    description:
      'Comma-separated active amenity codes. Multiple codes use AND semantics.',
    example: 'HANDWASHING,WHEELCHAIR_ACCESS',
  })
  @Transform(parseAmenityCodes)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(AMENITY_CODE_PATTERN, { each: true })
  amenities?: string[];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @ApiPropertyOptional({ enum: placeSortValues, default: 'newest' })
  @IsIn(placeSortValues)
  sort: PlaceSort = 'newest';

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ minimum: 0.1, maximum: 200 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(200)
  radiusKm?: number;
}
