import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 64 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  action?: string | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 64 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  targetType?: string | null;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
