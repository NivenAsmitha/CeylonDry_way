import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export class UpsertFacilityRatingDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  safety!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  accessibility!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  accuracy!: number;

  @ApiPropertyOptional({ minLength: 10, maxLength: 1000, nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reviewText?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsDateString({ strict: true })
  visitDate?: string | null;
}
