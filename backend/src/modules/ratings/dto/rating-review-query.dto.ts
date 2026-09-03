import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { ReviewModerationStatus } from '../../../generated/prisma/client.js';

export class PublicRatingReviewQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;
}

export class StaffRatingReviewQueryDto extends PublicRatingReviewQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ enum: ReviewModerationStatus })
  @IsOptional()
  @IsEnum(ReviewModerationStatus)
  status?: ReviewModerationStatus;
}
