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
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import {
  PropertyReportCategory,
  PropertyReportStatus,
} from '../../../generated/prisma/client.js';

export class AdminReportQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ enum: PropertyReportStatus })
  @IsOptional()
  @IsEnum(PropertyReportStatus)
  status?: PropertyReportStatus;

  @ApiPropertyOptional({ enum: PropertyReportCategory })
  @IsOptional()
  @IsEnum(PropertyReportCategory)
  category?: PropertyReportCategory;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
