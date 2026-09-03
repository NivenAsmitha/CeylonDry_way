import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export class SupportMessageDto {
  @ApiProperty({ minLength: 2, maxLength: 2000 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;
}
