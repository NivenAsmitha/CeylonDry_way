import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transforms/string.transforms';
import { PermissionKey } from '../../../generated/prisma/client.js';

export class UpdateRolePermissionsDto {
  @ApiProperty({ enum: PermissionKey, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionKey, { each: true })
  permissions!: PermissionKey[];

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
