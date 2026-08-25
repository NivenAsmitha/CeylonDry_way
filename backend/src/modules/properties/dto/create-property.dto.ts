import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PropertyType } from '../../../generated/prisma/client.js';
import {
  normalizeEmail,
  trimStringToNull,
} from '../../../common/transforms/string.transforms';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const AMENITY_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;

function normalizeAmenityCodes(params: TransformFnParams): unknown {
  if (!Array.isArray(params.value)) {
    return params.value;
  }

  return params.value.map((value: unknown) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
}

export class OpeningHourInputDto {
  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  isClosed!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  is24Hours!: boolean;

  @ApiPropertyOptional({ example: '08:30', nullable: true })
  @Transform(trimStringToNull)
  @ValidateIf(
    (openingHour: OpeningHourInputDto) =>
      !openingHour.isClosed && !openingHour.is24Hours,
  )
  @IsString()
  @Matches(TIME_PATTERN)
  openTime?: string | null;

  @ApiPropertyOptional({ example: '17:30', nullable: true })
  @Transform(trimStringToNull)
  @ValidateIf(
    (openingHour: OpeningHourInputDto) =>
      !openingHour.isClosed && !openingHour.is24Hours,
  )
  @IsString()
  @Matches(TIME_PATTERN)
  closeTime?: string | null;
}

export class CreatePropertyDto {
  @ApiPropertyOptional({ enum: PropertyType, nullable: true })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 160, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organisation?: string | null;

  @ApiPropertyOptional({ maxLength: 5_000, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 2_000, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  accessNotes?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  feeLkr?: number | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ format: 'email', maxLength: 254, nullable: true })
  @Transform((params: TransformFnParams) => {
    const value = normalizeEmail(params);
    return value === '' ? null : value;
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ format: 'uri', maxLength: 500, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @Transform(normalizeAmenityCodes)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(AMENITY_CODE_PATTERN, { each: true })
  amenityCodes?: string[];

  @ApiPropertyOptional({ type: [OpeningHourInputDto], maxItems: 7 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OpeningHourInputDto)
  openingHours?: OpeningHourInputDto[];
}
