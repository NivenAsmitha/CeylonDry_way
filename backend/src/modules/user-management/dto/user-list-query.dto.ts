import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { RoleName, UserStatus } from '../../../generated/prisma/client.js';

export const userSortValues = [
  'created_desc',
  'created_asc',
  'name_asc',
  'name_desc',
  'email_asc',
  'status_asc',
] as const;

export type UserSort = (typeof userSortValues)[number];

function parseBooleanQuery(params: TransformFnParams): unknown {
  if (params.value === true || params.value === 'true') return true;
  if (params.value === false || params.value === 'false') return false;
  return params.value;
}

export class UserListQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @Transform(parseBooleanQuery)
  @IsBoolean()
  includeDeleted = false;

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

  @ApiPropertyOptional({ enum: userSortValues, default: 'created_desc' })
  @IsIn(userSortValues)
  sort: UserSort = 'created_desc';
}
