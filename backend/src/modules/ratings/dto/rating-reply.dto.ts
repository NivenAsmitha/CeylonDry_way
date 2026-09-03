import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export class UpsertRatingReplyDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message!: string;
}
