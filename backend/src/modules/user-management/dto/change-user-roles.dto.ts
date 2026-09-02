import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transforms/string.transforms';
import { RoleName } from '../../../generated/prisma/client.js';

export class ChangeUserRolesDto {
  @ApiProperty({ enum: RoleName, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(RoleName, { each: true })
  roles!: RoleName[];

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
