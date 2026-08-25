import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../../common/transforms/string.transforms';

export class ManagementReasonDto {
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
